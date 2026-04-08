import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  internalAction,
  mutation,
  query,
  QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getClaimableGuestSessions } from "./guestSessions";
import {
  FREE_ACTIVE_LINK_LIMIT,
  FREE_ANALYTICS_RANGE_DAYS,
  getViewerPlan,
  makeGuestOwnerKey,
  makeUserOwnerKey,
} from "./ownership";

/**
 * Store or update user on login.
 * Returns { id, metadataUpdated } - metadataUpdated is true for new users
 * so the frontend knows to refresh the Clerk session token.
 */
export const store = mutation({
  args: {
    guestId: v.optional(v.string()),
  },
  returns: v.object({
    id: v.id("users"),
    metadataUpdated: v.boolean(),
    membership: v.string(),
    claimedLinkCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (existingUser !== null) {
      // User already exists - no metadata update needed
      if (existingUser.name !== identity.name) {
        await ctx.db.patch(existingUser._id, { name: identity.name });
      }
      const claimedLinkCount = await claimGuestLinksForUser(
        ctx,
        existingUser,
        args.guestId,
        identity.email ?? "",
      );

      await ctx.scheduler.runAfter(0, internal.users.syncOwnerAliasesToIngest, {
        accountUserId: existingUser._id,
        ownerKeys: [existingUser._id, makeUserOwnerKey(existingUser._id)],
      });

      return {
        id: existingUser._id,
        metadataUpdated: false,
        membership: existingUser.membership,
        claimedLinkCount,
      };
    }

    const membership = "free";

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name ?? "",
      membership,
      email: identity.email ?? "",
      tokenIdentifier: identity.tokenIdentifier,
    });

    const newUser = await ctx.db.get(userId);
    if (!newUser) {
      throw new Error("Failed to create user");
    }

    // Extract Clerk user ID from identity.subject (this is the raw Clerk user_xxx ID)
    const clerkUserId = identity.subject;

    // Schedule action to update Clerk metadata with convex_user_id
    await ctx.scheduler.runAfter(0, internal.users.syncMetadataToClerk, {
      convexUserId: userId,
      clerkUserId: clerkUserId,
      membership,
    });

    const claimedLinkCount = await claimGuestLinksForUser(
      ctx,
      newUser,
      args.guestId,
      identity.email ?? "",
    );

    await ctx.scheduler.runAfter(0, internal.users.syncOwnerAliasesToIngest, {
      accountUserId: userId,
      ownerKeys: [userId, makeUserOwnerKey(userId)],
    });

    return {
      id: userId,
      metadataUpdated: true,
      membership,
      claimedLinkCount,
    };
  },
});

/**
 * Internal action to call Clerk Backend API and set public_metadata.convex_user_id
 */
export const syncMetadataToClerk = internalAction({
  args: {
    convexUserId: v.id("users"),
    clerkUserId: v.string(),
    membership: v.string(),
  },
  handler: async (ctx, { convexUserId, clerkUserId, membership }) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error("[syncMetadataToClerk] CLERK_SECRET_KEY not set");
      return { success: false, error: "CLERK_SECRET_KEY not set" };
    }

    try {
      const response = await fetch(
        `https://api.clerk.com/v1/users/${clerkUserId}/metadata`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public_metadata: {
              convex_user_id: convexUserId,
              plan: membership === "pro" ? "pro" : "free",
            },
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[syncMetadataToClerk] Failed for ${clerkUserId}:`,
          response.status,
          errorText,
        );
        return { success: false, error: errorText };
      }

      console.log(
        `[syncMetadataToClerk] Success: ${clerkUserId} -> ${convexUserId}`,
      );
      return { success: true };
    } catch (error) {
      console.error("[syncMetadataToClerk] Error:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const syncOwnerAliasesToIngest = internalAction({
  args: {
    accountUserId: v.string(),
    ownerKeys: v.array(v.string()),
  },
  handler: async (_ctx, { accountUserId, ownerKeys }) => {
    const internalApiUrl = process.env.INTERNAL_API_URL;
    const apiSecret = process.env.API_SECRET;

    if (!internalApiUrl || !apiSecret || ownerKeys.length === 0) {
      return { success: false, skipped: true };
    }

    const baseUrl = internalApiUrl.replace(/\/analytics\/v2$/, "");
    const response = await fetch(`${baseUrl}/internal/owner-aliases`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accountUserId,
        ownerKeys,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[syncOwnerAliasesToIngest] Failed:", errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  },
});

export const getViewerState = query({
  args: {},
  returns: v.object({
    isSignedIn: v.boolean(),
    membership: v.union(v.literal("free"), v.literal("pro"), v.literal("guest")),
    analyticsDays: v.optional(v.number()),
    activeLinkLimit: v.optional(v.number()),
    canUsePaidOptions: v.boolean(),
    canUseCustomLogoQr: v.boolean(),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        isSignedIn: false,
        membership: "guest" as const,
        analyticsDays: FREE_ANALYTICS_RANGE_DAYS,
        activeLinkLimit: undefined,
        canUsePaidOptions: false,
        canUseCustomLogoQr: false,
      };
    }

    const plan = getViewerPlan(user.membership);
    return {
      isSignedIn: true,
      membership: (plan === "pro" ? "pro" : "free") as "free" | "pro",
      analyticsDays: plan === "pro" ? undefined : FREE_ANALYTICS_RANGE_DAYS,
      activeLinkLimit: plan === "pro" ? undefined : FREE_ACTIVE_LINK_LIMIT,
      canUsePaidOptions: plan === "pro",
      canUseCustomLogoQr: plan === "pro",
    };
  },
});

// ============================================================================
// EXISTING HELPER FUNCTIONS
// ============================================================================

/**
 * Queries a user by their token identifier.
 * @param {QueryCtx} ctx - The query context.
 * @param {string} clerkUserId - The user's token identifier.
 * @returns {Promise<Doc<"users"> | null>} The user document or null if not found.
 **/
export async function userQuery(
  ctx: QueryCtx,
  clerkUserId: string,
): Promise<Doc<"users"> | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", clerkUserId))
    .unique();

  return user;
}

/**
 * Retrieves the current authenticated user's details.
 * @param {QueryCtx} ctx - The query context.
 * @returns {Promise<Doc<"users"> | null>} The current user's document or null if not authenticated.
 */
export async function getCurrentUser(
  ctx: QueryCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return await userQuery(ctx, identity.tokenIdentifier);
}

async function claimGuestLinksForUser(
  ctx: MutationCtx,
  user: Doc<"users">,
  guestId: string | undefined,
  email: string,
) {
  const sessions = await getClaimableGuestSessions(ctx, guestId, email);
  if (sessions.length === 0) {
    return 0;
  }

  const guestIds = Array.from(new Set(sessions.map((session) => session.guestId)));
  const now = Date.now();
  const ownerKeys = guestIds.map((value) => makeGuestOwnerKey(value));
  let claimedLinkCount = 0;

  for (const currentGuestId of guestIds) {
    const guestUrls = await ctx.db
      .query("urls")
      .withIndex("by_guest", (q) => q.eq("guestId", currentGuestId))
      .collect();

    for (const url of guestUrls) {
      if (url.userTableId && url.userTableId !== user._id) {
        continue;
      }

      claimedLinkCount += 1;

      await ctx.db.patch(url._id, {
        userTableId: user._id,
        ownershipState: "user",
        analyticsOwnerKey: makeUserOwnerKey(user._id),
        claimedAt: now,
      });

      const clickEvents = await ctx.db
        .query("clickEvents")
        .withIndex("by_url", (q) => q.eq("urlId", url._id))
        .collect();
      for (const event of clickEvents) {
        await ctx.db.patch(event._id, {
          userId: user._id,
        });
      }

      const healthCheck = await ctx.db
        .query("linkHealthChecks")
        .withIndex("by_url_id", (q) => q.eq("urlId", url._id))
        .unique();
      if (healthCheck) {
        await ctx.db.patch(healthCheck._id, {
          userId: user._id,
        });
      }

      const summaries = await ctx.db
        .query("linkHealthDailySummary")
        .withIndex("by_url_id", (q) => q.eq("urlId", url._id))
        .collect();
      for (const summary of summaries) {
        await ctx.db.patch(summary._id, {
          userId: user._id,
        });
      }

      const incidents = await ctx.db
        .query("linkIncidents")
        .withIndex("by_url_id", (q) => q.eq("urlId", url._id))
        .collect();
      for (const incident of incidents) {
        await ctx.db.patch(incident._id, {
          userId: user._id,
        });
      }

      await ctx.scheduler.runAfter(0, internal.redisAction.insertIntoRedis, {
        fullUrl: url.fullurl,
        slugAssigned: url.slugAssigned ?? url.shortUrl,
        docId: url._id,
        analytics_owner_key: makeUserOwnerKey(user._id),
        convex_user_id: user._id,
        utmSource: url.utmSource,
        utmMedium: url.utmMedium,
        utmCampaign: url.utmCampaign,
        utmTerm: url.utmTerm,
        utmContent: url.utmContent,
        overwrite: true,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.linkHealth.registerUrlWithMonitoringService,
        {
          convexUrlId: url._id,
          convexUserId: user._id,
          longUrl: url.fullurl,
          shortUrl: url.slugAssigned ?? url.shortUrl,
        },
      );
    }
  }

  for (const session of sessions) {
    await ctx.db.patch(session._id, {
      claimedUserId: user._id,
      claimedAt: now,
      updatedAt: now,
    });
  }

  if (ownerKeys.length > 0) {
    await ctx.scheduler.runAfter(0, internal.users.syncOwnerAliasesToIngest, {
      accountUserId: user._id,
      ownerKeys,
    });
  }

  return claimedLinkCount;
}

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
import { verifyGuestSessionToken } from "./guestTokens";
import { queueServiceSync, queueUrlSync } from "./serviceSync";
import { transferGuestLinkToAccount } from "./accountCounters";
import {
  FREE_ACTIVE_LINK_LIMIT,
  FREE_ANALYTICS_RANGE_DAYS,
  getViewerPlan,
  makeGuestOwnerKey,
  makeUserOwnerKey,
} from "./ownership";

/**
 * Store or update user on login.
 * Metadata delivery is confirmed separately by getAccountSyncState.
 */
export const store = mutation({
  args: {
    guestId: v.optional(v.string()),
    guestToken: v.optional(v.string()),
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
      if (typeof identity.name === "string" && existingUser.name !== identity.name) {
        await ctx.db.patch(existingUser._id, { name: identity.name });
      }
      const claimedLinkCount = await claimGuestLinksForUser(
        ctx,
        existingUser,
        args.guestId,
        args.guestToken,
      );

      await queueServiceSync(ctx, `owner:${existingUser._id}`, { kind: "owner", userId: existingUser._id,
        ownerKeys: [existingUser._id, makeUserOwnerKey(existingUser._id)] });
      if (!existingUser.metadataSyncedAt) await queueServiceSync(ctx, `clerk:${existingUser._id}`, {
        kind: "clerk", userId: existingUser._id, clerkUserId: identity.subject,
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
      countersReady: true,
    });

    const newUser = await ctx.db.get(userId);
    if (!newUser) {
      throw new Error("Failed to create user");
    }

    // Extract Clerk user ID from identity.subject (this is the raw Clerk user_xxx ID)
    const clerkUserId = identity.subject;

    await queueServiceSync(ctx, `clerk:${userId}`, { kind: "clerk", userId, clerkUserId });

    const claimedLinkCount = await claimGuestLinksForUser(
      ctx,
      newUser,
      args.guestId,
      args.guestToken,
    );

    await queueServiceSync(ctx, `owner:${userId}`, { kind: "owner", userId,
      ownerKeys: [userId, makeUserOwnerKey(userId)] });

    return {
      id: userId,
      metadataUpdated: false,
      membership,
      claimedLinkCount,
    };
  },
});

/** Compatibility for actions already scheduled before the migration. */
export const syncMetadataToClerk = internalAction({
  args: { convexUserId: v.id("users"), clerkUserId: v.string(), membership: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.serviceSync.enqueue, { key: `clerk:${args.convexUserId}`,
      target: { kind: "clerk", userId: args.convexUserId, clerkUserId: args.clerkUserId } });
    return null;
  },
});
export const syncOwnerAliasesToIngest = internalAction({
  args: { accountUserId: v.id("users"), ownerKeys: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.serviceSync.enqueue, { key: `owner:${args.accountUserId}`,
      target: { kind: "owner", userId: args.accountUserId, ownerKeys: args.ownerKeys } });
    return null;
  },
});

export const getAccountSyncState = query({
  args: {},
  returns: v.union(v.null(), v.object({ userId: v.id("users"), metadataSyncedAt: v.optional(v.number()) })),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user ? { userId: user._id, metadataSyncedAt: user.metadataSyncedAt } : null;
  },
});

export const getViewerState = query({
  args: {},
  returns: v.object({
    userId: v.optional(v.id("users")),
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
      userId: user._id,
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
  guestToken: string | undefined,
) {
  let verifiedGuestId: string | undefined;
  if (guestId && guestToken) {
    verifiedGuestId = await verifyGuestSessionToken(guestId, guestToken);
  }

  const sessions = await getClaimableGuestSessions(ctx, verifiedGuestId);
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

      if (url.userTableId === user._id) continue;
      claimedLinkCount += 1;
      await transferGuestLinkToAccount(ctx, url, user._id);

      await ctx.db.patch(url._id, {
        userTableId: user._id,
        ownershipState: "user",
        analyticsOwnerKey: makeUserOwnerKey(user._id),
        claimedAt: now,
      });

      const claimedUrl = await ctx.db.get(url._id);
      if (claimedUrl) await queueUrlSync(ctx, claimedUrl);

    }
  }

  for (const session of sessions) {
    await ctx.db.patch(session._id, {
      claimedUserId: user._id,
      ownerAliasSynced: true,
      claimedAt: now,
      updatedAt: now,
    });
  }

  if (ownerKeys.length > 0) {
    for (const ownerKey of ownerKeys) await queueServiceSync(ctx, `owner:${user._id}:${ownerKey}`, { kind: "owner", userId: user._id, ownerKeys: [ownerKey] });
  }

  return claimedLinkCount;
}

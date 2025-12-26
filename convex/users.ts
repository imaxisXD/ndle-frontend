import { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { mutation, QueryCtx, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Store or update user on login.
 * Returns { id, metadataUpdated } - metadataUpdated is true for new users
 * so the frontend knows to refresh the Clerk session token.
 */
export const store = mutation({
  args: {},
  returns: v.object({
    id: v.id("users"),
    metadataUpdated: v.boolean(),
  }),
  handler: async (ctx) => {
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
      return { id: existingUser._id, metadataUpdated: false };
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      name: identity.name ?? "",
      membership: "pro",
      email: identity.email ?? "",
      tokenIdentifier: identity.tokenIdentifier,
    });

    // Extract Clerk user ID from identity.subject (this is the raw Clerk user_xxx ID)
    const clerkUserId = identity.subject;

    // Schedule action to update Clerk metadata with convex_user_id
    await ctx.scheduler.runAfter(0, internal.users.syncMetadataToClerk, {
      convexUserId: userId,
      clerkUserId: clerkUserId,
    });

    return { id: userId, metadataUpdated: true };
  },
});

/**
 * Internal action to call Clerk Backend API and set public_metadata.convex_user_id
 */
export const syncMetadataToClerk = internalAction({
  args: {
    convexUserId: v.id("users"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, { convexUserId, clerkUserId }) => {
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
            public_metadata: { convex_user_id: convexUserId },
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

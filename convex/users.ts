import { Doc } from "./_generated/dataModel";
import { mutation, QueryCtx } from "./_generated/server";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (user !== null) {
      // If we've seen this identity before but the name has changed, patch the value.
      if (user.name !== identity.name) {
        await ctx.db.patch(user._id, { name: identity.name });
      }
      return user._id;
    }
    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name: identity.name ?? "",
      membership: "pro",
      email: identity.email ?? "",
      tokenIdentifier: identity.tokenIdentifier,
    });
  },
});

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

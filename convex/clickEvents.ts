import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Query to get recent click events for a specific link.
 * Uses reactive subscription for real-time updates.
 */
export const getRecentByLinkSlug = query({
  args: {
    linkSlug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { linkSlug, limit = 20 }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const link = await ctx.db
      .query("urls")
      .withIndex("by_slug", (q) => q.eq("slugAssigned", linkSlug))
      .first();
    if (!link || link.userTableId !== user._id) {
      return [];
    }

    return await ctx.db
      .query("clickEvents")
      .withIndex("by_url", (q) => q.eq("urlId", link._id))
      .order("desc")
      .take(Math.min(100, Math.max(1, Math.floor(limit))));
  },
});

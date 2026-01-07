import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
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
    // check if user is auth and link is owned by user
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const link = await ctx.db
      .query("urls")
      .withIndex("by_slug", (q) => q.eq("slugAssigned", linkSlug))
      .first();
    if (!link) {
      return [];
    }
    if (link.userTableId !== user._id) {
      return [];
    }
    const events = await ctx.db
      .query("clickEvents")
      .withIndex("by_link_slug", (q) => q.eq("linkSlug", linkSlug))
      .order("desc")
      .take(limit);

    return events;
  },
});

/**
 * Query to get recent click events for a user (all links).
 */
export const getRecentByUser = internalQuery({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 20 }) => {
    const events = await ctx.db
      .query("clickEvents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return events;
  },
});

/**
 * Internal mutation to insert a click event.
 * Called from CF Worker via mutateUrlAnalytics.
 */
export const insertClickEvent = internalMutation({
  args: {
    linkSlug: v.string(),
    urlId: v.optional(v.id("urls")),
    userId: v.id("users"),
    occurredAt: v.number(),
    country: v.string(),
    city: v.optional(v.string()),
    deviceType: v.string(),
    browser: v.string(),
    os: v.string(),
    referer: v.optional(v.string()),
  },
  returns: v.id("clickEvents"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("clickEvents", args);
    return id;
  },
});

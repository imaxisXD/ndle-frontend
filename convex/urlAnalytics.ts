import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";

export const mutateClickCount = mutation({
  args: {
    urlId: v.string(),
    userId: v.string(),
    sharedSecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (args.sharedSecret !== process.env.SHARED_SECRET) {
      console.error("Invalid shared secret");
      throw new ConvexError("Invalid shared secret");
    }
    const normalisedUrlId = ctx.db.normalizeId("urls", args.urlId);
    const normalisedUserId = ctx.db.normalizeId("users", args.userId);
    if (!normalisedUrlId || !normalisedUserId) {
      console.error("Invalid URL or user ID");
      throw new ConvexError("Invalid URL or user ID");
    }
    const url = await ctx.db.get(normalisedUrlId);
    if (!url) {
      console.error("URL not found");
      throw new ConvexError("URL not found");
    }
    const user = await ctx.db.get(normalisedUserId);
    if (!user) {
      console.error("User not found");
      throw new ConvexError("User not found");
    }
    const urlAnalytics = await ctx.db
      .query("urlAnalytics")
      .withIndex("by_url", (q) => q.eq("urlId", normalisedUrlId))
      .unique();
    if (!urlAnalytics) {
      return await ctx.db.insert("urlAnalytics", {
        urlId: normalisedUrlId,
        totalClickCounts: 1,
        updatedAt: Date.now(),
      });
    } else {
      return await ctx.db.patch(urlAnalytics._id, {
        totalClickCounts: urlAnalytics.totalClickCounts + 1,
        updatedAt: Date.now(),
      });
    }
  },
});

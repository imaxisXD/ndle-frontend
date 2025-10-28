import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { ShardedCounter } from "@convex-dev/sharded-counter";
import { components } from "./_generated/api";

export const counter = new ShardedCounter(components.shardedCounter);

export const mutateUrlAnalytics = mutation({
  args: {
    urlId: v.string(),
    userId: v.string(),
    sharedSecret: v.string(),
    urlStatusMessage: v.string(),
    urlStatusCode: v.number(),
    requestId: v.string(),
  },
  returns: v.object({
    processed: v.boolean(),
    message: v.string(),
  }),
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

    // Idempotency check: if this requestId was already processed, return early
    if (urlAnalytics?.lastProcessedRequestId === args.requestId) {
      console.log(
        `Duplicate request detected for requestId: ${args.requestId}, urlId: ${normalisedUrlId}`,
      );
      return { processed: false, message: "Request already processed" };
    }

    const key = `url:${normalisedUrlId}`;
    await counter.inc(ctx, key);

    if (!urlAnalytics) {
      await ctx.db.insert("urlAnalytics", {
        urlId: normalisedUrlId,
        updatedAt: Date.now(),
        urlStatusMessage: args.urlStatusMessage,
        urlStatusCode: args.urlStatusCode,
        lastProcessedRequestId: args.requestId,
      });
      return { processed: true, message: "Analytics created" };
    } else {
      // Update only when urlStatusMessage or urlStatusCode is changed or updatedAt is older than 1 hour
      if (
        urlAnalytics.urlStatusMessage !== args.urlStatusMessage ||
        urlAnalytics.urlStatusCode !== args.urlStatusCode ||
        urlAnalytics.updatedAt < Date.now() - 1000 * 60 * 60 // 1 hour
      ) {
        await ctx.db.patch(urlAnalytics._id, {
          updatedAt: Date.now(),
          urlStatusMessage: args.urlStatusMessage,
          urlStatusCode: args.urlStatusCode,
          lastProcessedRequestId: args.requestId,
        });
        return { processed: true, message: "Analytics updated" };
      }
      // Even if we don't update the analytics, we still need to update the requestId
      await ctx.db.patch(urlAnalytics._id, {
        lastProcessedRequestId: args.requestId,
      });
      return {
        processed: true,
        message: "Request processed, no analytics update needed",
      };
    }
  },
});

export const getUrlAnalytics = query({
  args: {
    urlSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const getUser = await getCurrentUser(ctx);
    if (!getUser) {
      return {
        analytics: null,
        url: null,
        isError: true,
        message: "User not found",
      };
    }

    const url = await ctx.db
      .query("urls")
      .withIndex("by_user_slug", (q) =>
        q.eq("userTableId", getUser._id).eq("slugAssigned", args.urlSlug),
      )
      .unique();

    if (!url) {
      //This can also happen when user deletes the url
      return {
        analytics: null,
        url: null,
        isError: true,
        message: "",
      };
    }

    if (url.userTableId !== getUser._id) {
      console.error(
        getUser._id,
        url.userTableId,
        "Error: Trying to access someone else's analytics",
      );
      return {
        analytics: null,
        url: null,
        isError: true,
        message: "Nice Try Nerd!",
      };
    }

    const analytics = await ctx.db
      .query("urlAnalytics")
      .withIndex("by_url", (q) => q.eq("urlId", url._id))
      .unique();

    const key = `url:${url._id}`;
    const totalClickCounts = await counter.count(ctx, key);
    const analyticsWithCount = analytics
      ? { ...analytics, totalClickCounts }
      : null;

    return {
      analytics: analyticsWithCount,
      url,
      isError: false,
      message: "success",
    };
  },
});

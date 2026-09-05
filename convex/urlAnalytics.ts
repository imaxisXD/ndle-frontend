import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { ShardedCounter } from "@convex-dev/sharded-counter";
import { components } from "./_generated/api";
import { getOwnerSnapshot } from "./ownership";
import { accountCounter, accountCountsReady } from "./accountCounters";
import { incrementCollectionClicks } from "./collectionMangament";

export const counter = new ShardedCounter(components.shardedCounter);

export const mutateUrlAnalytics = mutation({
  args: {
    urlId: v.string(),
    sharedSecret: v.string(),
    urlStatusMessage: v.string(),
    urlStatusCode: v.number(),
    requestId: v.string(),
    // Optional click event data for real-time activity
    clickEvent: v.optional(
      v.object({
        linkSlug: v.string(),
        occurredAt: v.number(),
        country: v.string(),
        city: v.optional(v.string()),
        deviceType: v.string(),
        browser: v.string(),
        os: v.string(),
        referer: v.optional(v.string()),
      }),
    ),
  },
  returns: v.object({
    processed: v.boolean(),
    message: v.string(),
    outcome: v.union(v.literal("recorded"), v.literal("duplicate"), v.literal("link_deleted"), v.literal("tracking_disabled"), v.literal("too_old")),
  }),
  handler: async (ctx, args) => {
    if (!process.env.SHARED_SECRET || args.sharedSecret !== process.env.SHARED_SECRET) {
      throw new ConvexError("Invalid shared secret");
    }
    if (!args.requestId.trim() || args.requestId.length > 200) throw new ConvexError("Invalid click ID");
    const occurredAt = args.clickEvent?.occurredAt ?? Date.now();
    if (!Number.isFinite(occurredAt) || occurredAt > Date.now() + 300_000) throw new ConvexError("Invalid click time");
    if (occurredAt < Date.now() - 35 * 86_400_000) return { processed: false, message: "Click is outside the live update window", outcome: "too_old" as const };
    const normalisedUrlId = ctx.db.normalizeId("urls", args.urlId);
    if (!normalisedUrlId) throw new ConvexError("Invalid URL ID");
    const url = await ctx.db.get(normalisedUrlId);
    if (!url) return { processed: false, message: "Link was deleted", outcome: "link_deleted" as const };
    if (!url.trackingEnabled) return { processed: false, message: "Tracking is disabled", outcome: "tracking_disabled" as const };

    const existingRequest = await ctx.db
      .query("processedClickRequests")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (existingRequest) {
      return { processed: false, message: "Request already processed", outcome: "duplicate" as const };
    }

    await ctx.db.insert("processedClickRequests", {
      requestId: args.requestId,
      urlId: normalisedUrlId,
      createdAt: Date.now(),
    });

    // Insert click event if provided
    if (args.clickEvent && occurredAt >= Date.now() - 30 * 86_400_000) {
      const owner = getOwnerSnapshot(url);
      await ctx.db.insert("clickEvents", {
        linkSlug: args.clickEvent.linkSlug,
        urlId: normalisedUrlId,
        userId: owner.userId,
        guestId: owner.guestId,
        analyticsOwnerKey: owner.analyticsOwnerKey,
        occurredAt: args.clickEvent.occurredAt,
        country: args.clickEvent.country,
        city: args.clickEvent.city,
        deviceType: args.clickEvent.deviceType,
        browser: args.clickEvent.browser,
        os: args.clickEvent.os,
        referer: args.clickEvent.referer,
      });
    }

    await counter.inc(ctx, `url:${normalisedUrlId}`);
    if (url.userTableId && url.accountCountersIncluded) await accountCounter.inc(ctx, `user-clicks:${url.userTableId}`);

    await incrementCollectionClicks(ctx, normalisedUrlId);

    // Redirect delivery is not a destination health check. Monitoring owns health state.
    return { processed: true, message: "Click recorded", outcome: "recorded" as const };
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

export const getUsersTotalClicks = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return 0;
    }
    if (!await accountCountsReady(ctx, user._id)) return null;
    return await accountCounter.count(ctx, `user-clicks:${user._id}`);
  },
});

export const getUsersLinkCount = query({
  args: {}, returns: v.union(v.number(), v.null()),
  handler: async ctx => {
    const user = await getCurrentUser(ctx);
    if (!user) return 0;
    if (!await accountCountsReady(ctx, user._id)) return null;
    return await accountCounter.count(ctx, `user-links:${user._id}`);
  },
});

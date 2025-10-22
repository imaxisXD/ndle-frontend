import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getTTLForRange, generateCacheKey } from "./utils";
import { getCurrentUser } from "./users";

export const getCacheEntry = internalQuery({
  args: { cacheKey: v.string() },
  handler: async (ctx, args) => {
    const cache = await ctx.db
      .query("analytics_cache")
      .withIndex("by_cache_key", (q) => q.eq("cache_key", args.cacheKey))
      .first();
    return cache;
  },
});

export const setCacheEntry = internalMutation({
  args: {
    cache_key: v.string(),
    response_data: v.any(),
    ttl_seconds: v.number(),
    user_id: v.string(),
    query_scope: v.string(),
  },
  returns: v.id("analytics_cache"),
  handler: async (ctx, args) => {
    // Delete old cache entry if exists
    const existing = await ctx.db
      .query("analytics_cache")
      .withIndex("by_cache_key", (q) => q.eq("cache_key", args.cache_key))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    // Insert new cache entry
    const id = await ctx.db.insert("analytics_cache", {
      cache_key: args.cache_key,
      response_data: args.response_data,
      created_at: Date.now() / 1000, // Unix timestamp in seconds
      ttl_seconds: args.ttl_seconds,
      user_id: args.user_id,
      query_scope: args.query_scope,
    });

    return id;
  },
});

export const cleanupExpiredCache = internalMutation({
  args: {
    maxAgeSeconds: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx, args) => {
    const nowSeconds = Date.now() / 1000;
    const maxAgeSeconds = args.maxAgeSeconds ?? 86400; // default: 24h grace
    const threshold = nowSeconds - maxAgeSeconds;
    const batchSize = args.batchSize ?? 100;

    const expiredEntries = await ctx.db
      .query("analytics_cache")
      .withIndex("by_created_at", (q) => q.lt("created_at", threshold))
      .take(batchSize);

    let deletedCount = 0;
    for (const entry of expiredEntries) {
      await ctx.db.delete(entry._id);
      deletedCount++;
    }

    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} expired analytics cache entries`);
    }

    return { deleted: deletedCount };
  },
});

export const getAnalytics = query({
  args: {
    range: v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d"),
      v.literal("3mo"),
      v.literal("12mo"),
      v.literal("mtd"),
      v.literal("qtd"),
      v.literal("ytd"),
      v.literal("all"),
    ),
    linkSlug: v.optional(v.string()),
    scope: v.string(),
  },
  returns: v.object({
    data: v.any(),
    fresh: v.boolean(),
    cachedAt: v.number(),
    ttlSec: v.number(),
    exists: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        data: null,
        fresh: false,
        cachedAt: 0,
        ttlSec: 0,
        exists: false,
      };
    }
    const cacheKey = generateCacheKey({
      userId: user._id,
      range: args.range,
      linkSlug: args.linkSlug ?? undefined,
      scope: args.scope,
    });
    const entry = await ctx.db
      .query("analytics_cache")
      .withIndex("by_cache_key", (q) => q.eq("cache_key", cacheKey))
      .first();
    if (!entry) {
      return {
        data: null,
        fresh: false,
        cachedAt: 0,
        ttlSec: getTTLForRange(args.range),
        exists: false,
      };
    }
    const now = Date.now() / 1000;
    const fresh = now - entry.created_at < entry.ttl_seconds;
    return {
      data: entry.response_data,
      fresh,
      cachedAt: entry.created_at,
      ttlSec: entry.ttl_seconds,
      exists: true,
    };
  },
});

// Public mutation to request a refresh via internal action
export const requestRefresh = mutation({
  args: {
    range: v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d"),
      v.literal("3mo"),
      v.literal("12mo"),
      v.literal("mtd"),
      v.literal("qtd"),
      v.literal("ytd"),
      v.literal("all"),
    ),
    linkSlug: v.optional(v.string()),
    scope: v.string(),
  },
  returns: v.object({ scheduled: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { scheduled: false };
    }
    const cacheKey = generateCacheKey({
      userId: user._id,
      range: args.range,
      linkSlug: args.linkSlug ?? undefined,
      scope: args.scope,
    });
    const entry = await ctx.db
      .query("analytics_cache")
      .withIndex("by_cache_key", (q) => q.eq("cache_key", cacheKey))
      .first();
    const ttlSec = getTTLForRange(args.range);
    const now = Date.now() / 1000;
    const isFresh = entry ? now - entry.created_at < entry.ttl_seconds : false;
    if (isFresh) {
      return { scheduled: false };
    }
    // schedule background refresh
    await ctx.scheduler.runAfter(0, internal.tinyBirdAction.refreshAnalytics, {
      cacheKey,
      range: args.range,
      linkSlug: args.linkSlug ?? undefined,
      scope: args.scope,
      ttlSec,
      userId: user._id,
    });
    return { scheduled: true };
  },
});

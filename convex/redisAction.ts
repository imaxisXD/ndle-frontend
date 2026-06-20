import { Redis } from "@upstash/redis";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildRedirectProjection } from "./redisProjection";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const insertIntoRedis = internalAction({
  args: {
    fullUrl: v.string(),
    slugAssigned: v.string(),
    docId: v.id("urls"),
    analytics_owner_key: v.string(),
    convex_user_id: v.optional(v.id("users")),
    trackingEnabled: v.boolean(),
    expiresAt: v.optional(v.number()),
    // UTM Parameters
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    // A/B Testing
    abEnabled: v.optional(v.boolean()),
    abVariants: v.optional(
      v.array(
        v.object({
          id: v.string(),
          url: v.string(),
          weight: v.number(),
        }),
      ),
    ),
    abDistribution: v.optional(
      v.union(v.literal("weighted_random"), v.literal("deterministic")),
    ),
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const redisValueObject = buildRedirectProjection({
      fullUrl: args.fullUrl,
      docId: args.docId,
      analyticsOwnerKey: args.analytics_owner_key,
      convexUserId: args.convex_user_id,
      trackingEnabled: args.trackingEnabled,
      expiresAt: args.expiresAt,
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      utmTerm: args.utmTerm,
      utmContent: args.utmContent,
      abEnabled: args.abEnabled,
      abVariants: args.abVariants,
      abDistribution: args.abDistribution,
    });

    const result = args.overwrite
      ? await redis.json.set(
          args.slugAssigned,
          "$",
          redisValueObject as unknown as Record<string, unknown>,
        )
      : await redis.json.set(
          args.slugAssigned,
          "$",
          redisValueObject as unknown as Record<string, unknown>,
          {
            nx: true,
          },
        );

    await ctx.runMutation(internal.urlMainFuction.updateUrlStatus, {
      docId: args.docId,
      redisStatus: result ?? "failed",
      urlStatusMessage: result ? "success" : "failed",
    });

    return result;
  },
});

export const deleteFromRedis = internalAction({
  args: {
    slugAssigned: v.string(),
  },
  handler: async (_, args) => {
    try {
      const result = await redis.json.del(args.slugAssigned);
      console.log("redis json delete result", result);
      return true;
    } catch (error) {
      const result = await redis.del(args.slugAssigned);
      console.log("redis delete result", result);
      console.error(error);
    }
  },
});

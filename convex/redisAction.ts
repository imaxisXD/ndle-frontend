import { Redis } from "@upstash/redis";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { RedisValueObject } from "./utils";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const insertIntoRedis = internalAction({
  args: {
    fullUrl: v.string(),
    slugAssigned: v.string(),
    docId: v.id("urls"),
    user_id: v.id("users"),
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
  },
  handler: async (ctx, args) => {
    // Build utm_params object only with non-empty values
    const utmParams: Record<string, string> = {};
    if (args.utmSource) utmParams.utm_source = args.utmSource;
    if (args.utmMedium) utmParams.utm_medium = args.utmMedium;
    if (args.utmCampaign) utmParams.utm_campaign = args.utmCampaign;
    if (args.utmTerm) utmParams.utm_term = args.utmTerm;
    if (args.utmContent) utmParams.utm_content = args.utmContent;

    // Build A/B test config if enabled
    const abTestConfig =
      args.abEnabled && args.abVariants?.length
        ? {
            enabled: true,
            variants: args.abVariants,
            distribution: args.abDistribution ?? ("deterministic" as const),
          }
        : undefined;

    const redisValueObject: RedisValueObject = {
      destination: args.fullUrl,
      user_id: args.user_id,
      tenant_id: args.user_id,
      redirect_type: 302,
      created_at: Date.now(),
      updated_at: Date.now(),
      link_id: args.docId,
      is_active: true,
      expires_at: null,
      max_clicks: null,
      tags: [],
      utm_params: utmParams,
      rules: {
        ...(abTestConfig && { ab_test: abTestConfig }),
      },
      features: {
        track_clicks: true,
        track_conversions: true,
      },
      custom_metadata: {},
      version: 1,
    };

    const result = await redis.json.set(
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

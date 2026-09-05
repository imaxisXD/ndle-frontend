import { Redis } from "@upstash/redis";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { REDIRECT_SYNC_SCRIPT } from "./serviceSync";

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
    await ctx.runMutation(internal.serviceSync.enqueue, { key: `redirect:${args.slugAssigned}`,
      target: { kind: "redirect", urlId: args.docId, slug: args.slugAssigned } });
    return null;
  },
});

export const deleteFromRedis = internalAction({
  args: {
    slugAssigned: v.string(),
  },
  handler: async (_, args) => {
    // Only pre-migration jobs call this. A current revision always takes priority.
    await redis.eval(REDIRECT_SYNC_SCRIPT, [args.slugAssigned, `ndle:sync:${args.slugAssigned}`], ["0", ""]);
    return null;
  },
});

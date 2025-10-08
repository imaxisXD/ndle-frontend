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
  },
  handler: async (ctx, args) => {
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
      utm_params: {},
      rules: {},
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

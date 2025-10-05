import { Redis } from '@upstash/redis'
import { v } from 'convex/values';
import { internalAction } from './_generated/server';
import { internal } from './_generated/api';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

export const insertIntoRedis = internalAction({
  args: {
    fullUrl: v.string(),
    slugAssigned: v.string(),
    docId: v.id("urls"),
  },
  handler: async (ctx, args) => {
   const result = await redis.set(args.slugAssigned, args.fullUrl, {
    nx: true,
   });

   await ctx.runMutation(internal.urlShortner.updateUrlStatus, {
    docId: args.docId,
    redisStatus: result ?? "failed",
    urlStatusMessage: result ? "success" : "failed",
   });

   return result;
  },
});

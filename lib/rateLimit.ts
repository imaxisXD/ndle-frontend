import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let rateLimitInstance: Ratelimit | null = null;

export function getRateLimit() {
  if (!rateLimitInstance) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    rateLimitInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      prefix: "@upstash/ratelimit",
      analytics: true,
    });
  }
  return rateLimitInstance;
}

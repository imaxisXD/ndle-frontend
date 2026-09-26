import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const DEFAULT_GUEST_SESSIONS_PER_NETWORK_PER_DAY = 5;

/**
 * Analytics reads per route and account. One link page load sends about eight
 * requests at once (four of them to the breakdown route) and dashboards poll
 * every 10 seconds, so this is looser than the default limiter.
 */
export const ANALYTICS_RATE_LIMIT = { requests: 60, window: "10 s" } as const;

let redisInstance: Redis | null = null;
let rateLimitInstance: Ratelimit | null = null;
let analyticsRateLimitInstance: Ratelimit | null = null;
let guestSessionNetworkLimitInstance: Ratelimit | null = null;

function getRedis() {
  if (!redisInstance) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redisInstance;
}

export function getRateLimit() {
  if (!rateLimitInstance) {
    rateLimitInstance = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      prefix: "@upstash/ratelimit",
      analytics: true,
    });
  }
  return rateLimitInstance;
}

/**
 * Limiter for the analytics API routes. Key it by route and account only
 * (`analytics:<route>:<userId>`), never by client input such as a link slug:
 * every new value would open a fresh bucket.
 */
export function getAnalyticsRateLimit() {
  if (!analyticsRateLimitInstance) {
    analyticsRateLimitInstance = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(
        ANALYTICS_RATE_LIMIT.requests,
        ANALYTICS_RATE_LIMIT.window,
      ),
      prefix: "@upstash/ratelimit:analytics",
      analytics: true,
    });
  }
  return analyticsRateLimitInstance;
}

/** A positive whole number from GUEST_SESSIONS_PER_NETWORK_PER_DAY, or the default. */
export function getGuestSessionsPerNetworkPerDay() {
  const raw = process.env.GUEST_SESSIONS_PER_NETWORK_PER_DAY?.trim();
  const value = raw && /^\d+$/.test(raw) ? Number(raw) : 0;
  return value > 0 ? value : DEFAULT_GUEST_SESSIONS_PER_NETWORK_PER_DAY;
}

/**
 * New guest sessions per network key over 24 hours. Keyed by the hashed
 * network key, so no raw IP is kept for the day. Renewals are not counted.
 */
export function getGuestSessionNetworkRateLimit() {
  if (!guestSessionNetworkLimitInstance) {
    guestSessionNetworkLimitInstance = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(getGuestSessionsPerNetworkPerDay(), "24 h"),
      prefix: "@upstash/ratelimit:guest-session-network",
    });
  }
  return guestSessionNetworkLimitInstance;
}

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const DEFAULT_GUEST_SESSIONS_PER_NETWORK_PER_DAY = 5;

let redisInstance: Redis | null = null;
let rateLimitInstance: Ratelimit | null = null;
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

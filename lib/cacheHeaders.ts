/**
 * Cache header utilities for Railway + Cloudflare optimization
 *
 * This module provides consistent cache header configurations across all API routes.
 *
 * Header Precedence:
 * 1. Cloudflare-CDN-Cache-Control (most specific, only controls Cloudflare edge)
 * 2. Cache-Control (browser/client caching)
 * 3. CDN-Cache-Control (other CDNs, if used)
 */

export interface CacheConfig {
  browserMaxAge: number; // seconds
  edgeMaxAge: number; // seconds
  staleWhileRevalidate: number; // seconds
  isPrivate: boolean; // private vs public
}

/**
 * Standard cache configurations
 */
export const CACHE_PRESETS = {
  // Static assets, images, favicons - very long cache
  STATIC: {
    browserMaxAge: 2592000, // 30 days
    edgeMaxAge: 5184000, // 60 days
    staleWhileRevalidate: 86400, // 1 day additional
    isPrivate: false,
  },

  // API endpoints with public data - moderate cache
  PUBLIC_API: {
    browserMaxAge: 3600, // 1 hour
    edgeMaxAge: 86400, // 1 day
    staleWhileRevalidate: 172800, // 2 days additional
    isPrivate: false,
  },

  // User-specific/authenticated data - short cache
  PRIVATE_API: {
    browserMaxAge: 60, // 1 minute
    edgeMaxAge: 300, // 5 minutes
    staleWhileRevalidate: 600, // 10 minutes additional
    isPrivate: true,
  },

  // Rapidly changing data - very short cache
  DYNAMIC: {
    browserMaxAge: 30, // 30 seconds
    edgeMaxAge: 60, // 1 minute
    staleWhileRevalidate: 120, // 2 minutes additional
    isPrivate: false,
  },

  // Error responses - short but resilient
  ERROR: {
    browserMaxAge: 300, // 5 minutes
    edgeMaxAge: 1800, // 30 minutes
    staleWhileRevalidate: 86400, // 1 day additional
    isPrivate: false,
  },

  // No caching - sensitive/real-time
  NO_CACHE: {
    browserMaxAge: 0,
    edgeMaxAge: 0,
    staleWhileRevalidate: 0,
    isPrivate: true,
  },
} as const;

/**
 * Build cache headers from a configuration
 */
export function getCacheHeaders(config: CacheConfig): Record<string, string> {
  const headers: Record<string, string> = {};

  if (config.browserMaxAge === 0 && config.edgeMaxAge === 0) {
    // No caching
    headers["Cache-Control"] =
      "no-store, no-cache, must-revalidate, proxy-revalidate";
    headers["Cloudflare-CDN-Cache-Control"] =
      "no-store, no-cache, must-revalidate";
    headers["Pragma"] = "no-cache";
    headers["Expires"] = "0";
    return headers;
  }

  // Browser cache (Cache-Control)
  const cacheControlParts = [
    config.isPrivate ? "private" : "public",
    `max-age=${config.browserMaxAge}`,
  ];
  if (config.staleWhileRevalidate > 0) {
    cacheControlParts.push(
      `stale-while-revalidate=${config.staleWhileRevalidate}`,
    );
  }
  headers["Cache-Control"] = cacheControlParts.join(", ");

  // Cloudflare edge cache (Cloudflare-CDN-Cache-Control)
  const cfCacheControlParts = [
    config.isPrivate ? "private" : "public",
    `max-age=${config.edgeMaxAge}`,
  ];
  if (config.staleWhileRevalidate > 0) {
    cfCacheControlParts.push(
      `stale-while-revalidate=${config.staleWhileRevalidate * 2}`,
    );
  }
  headers["Cloudflare-CDN-Cache-Control"] = cfCacheControlParts.join(", ");

  // Other CDNs (if needed)
  const cdnCacheControlParts = [
    config.isPrivate ? "private" : "public",
    `max-age=${Math.round(config.edgeMaxAge * 0.75)}`,
  ];
  if (config.staleWhileRevalidate > 0) {
    cdnCacheControlParts.push(
      `stale-while-revalidate=${Math.round(config.staleWhileRevalidate * 1.5)}`,
    );
  }
  headers["CDN-Cache-Control"] = cdnCacheControlParts.join(", ");

  // Vary header for user-specific data
  if (config.isPrivate) {
    headers["Vary"] = "Authorization, Cookie";
  } else {
    headers["Vary"] = "Accept-Encoding";
  }

  return headers;
}

/**
 * Get cache headers using a preset
 */
export function getCacheHeadersPreset(
  preset: keyof typeof CACHE_PRESETS,
): Record<string, string> {
  return getCacheHeaders(CACHE_PRESETS[preset]);
}

/**
 * Custom cache configuration builder for fine-tuning
 */
export class CacheHeaderBuilder {
  private config: CacheConfig = CACHE_PRESETS.PUBLIC_API;

  constructor(preset?: keyof typeof CACHE_PRESETS) {
    if (preset) {
      this.config = { ...CACHE_PRESETS[preset] };
    }
  }

  setBrowserMaxAge(seconds: number): this {
    this.config.browserMaxAge = seconds;
    return this;
  }

  setEdgeMaxAge(seconds: number): this {
    this.config.edgeMaxAge = seconds;
    return this;
  }

  setStaleWhileRevalidate(seconds: number): this {
    this.config.staleWhileRevalidate = seconds;
    return this;
  }

  setPrivate(isPrivate: boolean): this {
    this.config.isPrivate = isPrivate;
    return this;
  }

  build(): Record<string, string> {
    return getCacheHeaders(this.config);
  }
}

/**
 * Utility to apply cache headers to a Response object
 */
export function applyHeaders(
  response: Response,
  headers: Record<string, string>,
): Response {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Common cache scenarios
 */
export const CACHE_SCENARIOS = {
  // Favicon or static image lookup
  faviconFound: () => new CacheHeaderBuilder("STATIC").build(),

  faviconNotFound: () =>
    new CacheHeaderBuilder("ERROR").setEdgeMaxAge(21600).build(),

  // Analytics endpoints
  analyticsPublic: () =>
    new CacheHeaderBuilder("PUBLIC_API")
      .setEdgeMaxAge(3600)
      .setBrowserMaxAge(300)
      .build(),

  analyticsPrivate: () =>
    new CacheHeaderBuilder("PRIVATE_API")
      .setEdgeMaxAge(600)
      .setBrowserMaxAge(60)
      .build(),

  // User data endpoints
  userData: () => new CacheHeaderBuilder("PRIVATE_API").build(),

  userList: () =>
    new CacheHeaderBuilder("PUBLIC_API").setBrowserMaxAge(600).build(),

  // Link data endpoints
  linkMetadata: () =>
    new CacheHeaderBuilder("STATIC")
      .setEdgeMaxAge(2592000)
      .setBrowserMaxAge(604800)
      .build(),

  linkAnalytics: () =>
    new CacheHeaderBuilder("PRIVATE_API").setEdgeMaxAge(300).build(),

  // Error responses
  serverError: () => new CacheHeaderBuilder("ERROR").build(),

  notFound: () =>
    new CacheHeaderBuilder("ERROR")
      .setEdgeMaxAge(1800)
      .setBrowserMaxAge(600)
      .build(),

  unauthorized: () => new CacheHeaderBuilder("NO_CACHE").build(),
};

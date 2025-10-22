"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { type DashboardAnalyticsPayload } from "./utils";
import { internal } from "./_generated/api";

type AnalyticsRange =
  | "24h"
  | "7d"
  | "30d"
  | "3mo"
  | "12mo"
  | "mtd"
  | "qtd"
  | "ytd"
  | "all";

const analyticsRangeValidator = v.union(
  v.literal("24h"),
  v.literal("7d"),
  v.literal("30d"),
  v.literal("3mo"),
  v.literal("12mo"),
  v.literal("mtd"),
  v.literal("qtd"),
  v.literal("ytd"),
  v.literal("all"),
);

type TinybirdParams = Record<string, string | number | boolean | undefined>;

function buildQuery(params: TinybirdParams): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    usp.append(k, String(v));
  }
  return usp.toString();
}

async function tinybirdFetch<T>(
  pipeName: string,
  params: TinybirdParams,
): Promise<T> {
  const host = process.env.TINYBIRD_API_URL;
  const token = process.env.TINYBIRD_TOKEN;
  if (!host) {
    throw new Error("Missing TINYBIRD_API_URL env");
  }
  if (!token) {
    throw new Error("Missing TINYBIRD_TOKEN env");
  }

  const qs = buildQuery({ ...params, token });
  const url = `${host}/v0/pipes/${pipeName}.json?${qs}`;
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Tinybird error ${res.status}: ${text}`);
  }
  try {
    const json = (await res.json()) as T;
    return json;
  } catch (error) {
    throw new Error(
      `Tinybird JSON parse error for ${pipeName}: ${String(error)}`,
    );
  }
}

function formatForTinybird(dt: Date): string {
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const HH = String(dt.getUTCHours()).padStart(2, "0");
  const MM = String(dt.getUTCMinutes()).padStart(2, "0");
  const SS = String(dt.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
}

function getUtcRange(range: AnalyticsRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      0,
      0,
    ),
  );

  if (range === "24h") {
    return { start: new Date(end.getTime() - 24 * 60 * 60 * 1000), end };
  }
  if (range === "7d") {
    return { start: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000), end };
  }
  if (range === "30d") {
    return { start: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000), end };
  }
  if (range === "3mo") {
    const threeMonthsAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate()),
    );
    return { start: threeMonthsAgo, end };
  }
  if (range === "12mo") {
    const twelveMonthsAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, now.getUTCDate()),
    );
    return { start: twelveMonthsAgo, end };
  }
  if (range === "mtd") {
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      end,
    };
  }
  if (range === "qtd") {
    const q = Math.floor(now.getUTCMonth() / 3);
    return {
      start: new Date(Date.UTC(now.getUTCFullYear(), q * 3, 1)),
      end,
    };
  }
  if (range === "ytd") {
    return { start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)), end };
  }
  return { start: new Date(0), end };
}

// Main action to get dashboard analytics with caching
export const refreshAnalytics = internalAction({
  args: {
    cacheKey: v.string(),
    range: analyticsRangeValidator,
    linkSlug: v.optional(v.string()),
    scope: v.string(),
    ttlSec: v.number(),
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const cacheKey = args.cacheKey;

    // Cache miss or bypassed - fetch from Tinybird (parallel)
    const { start, end } = getUtcRange(args.range);
    const start_date = formatForTinybird(start);
    const end_date = formatForTinybird(end);

    const commonParams: TinybirdParams = {
      start_date,
      end_date,
      link_slug: args.linkSlug,
      user_id: args.userId,
    };

    try {
      const [timeseries, unified] = await Promise.all([
        tinybirdFetch<DashboardAnalyticsPayload["timeseries"]>(
          "optimized_timeseries",
          commonParams,
        ),
        tinybirdFetch<{
          data: Array<{
            breakdown_type: string;
            label: string | null;
            total_clicks: number;
            total_sessions?: number;
            new_sessions?: number;
            human_clicks?: number;
            bot_clicks?: number;
            avg_latency?: number | null;
          }>;
        }>("unified_breakdown", { ...commonParams, limit: 20 }),
      ]);

      const grouped = unified.data.reduce(
        (acc, row) => {
          const key = row.breakdown_type as
            | "browsers"
            | "countries"
            | "devices"
            | "operating_systems"
            | "datacenters"
            | "traffic_sources"
            | "top_links";
          if (!acc[key]) acc[key] = [] as Array<[string | null, number]>;
          (acc[key] as Array<[string | null, number]>).push([
            row.label ?? "unknown",
            row.total_clicks ?? 0,
          ]);
          return acc;
        },
        {} as Record<string, Array<[string | null, number]>>,
      );

      const batchedResponse = {
        timeseries,
        snapshot: {
          browsers: grouped.browsers ?? [],
          countries: grouped.countries ?? [],
          devices: grouped.devices ?? [],
          os: grouped.operating_systems ?? [],
          datacenters: grouped.datacenters ?? [],
          traffic_sources: grouped.traffic_sources ?? [],
          top_links: grouped.top_links ?? [],
        },
      } as const;

      // Store in cache
      await ctx.runMutation(internal.analyticsCache.setCacheEntry, {
        cache_key: cacheKey,
        response_data: batchedResponse,
        ttl_seconds: args.ttlSec,
        user_id: args.userId,
        query_scope: args.scope,
      });

      console.log("Stored new cache for", cacheKey);
      return null;
    } catch (error) {
      console.error("Tinybird fetch error:", error);
      throw new Error(
        `Failed to load Tinybird analytics pipes for cache key ${cacheKey}: ${String(
          error,
        )}`,
      );
    }
  },
});

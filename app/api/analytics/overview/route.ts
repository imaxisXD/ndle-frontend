import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { tinybirdFetch } from "@/lib/tinybird";
import {
  AnalyticsRange,
  getUtcRange,
  formatForTinybird,
} from "@/lib/analyticsRanges";
import { getRateLimit } from "@/lib/rateLimit";

const schema = z.object({
  range: z
    .union([
      z.literal("24h"),
      z.literal("7d"),
      z.literal("30d"),
      z.literal("3mo"),
      z.literal("12mo"),
      z.literal("mtd"),
      z.literal("qtd"),
      z.literal("ytd"),
      z.literal("all"),
    ])
    .default("7d"),
  link_slug: z.string().min(1).optional(),
});

/**
 * Cache headers for authenticated analytics endpoints
 * User-specific data should be private but can be served stale while revalidating
 */
const getAnalyticsCacheHeaders = (hasAuth: boolean): Record<string, string> => {
  if (!hasAuth) {
    return {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Cloudflare-CDN-Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };
  }

  return {
    // 60 seconds in browser cache, stale-while-revalidate for 2 minutes
    "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
    // Cloudflare: 5 minutes cache, but don't cache in edge for user-specific data
    "Cloudflare-CDN-Cache-Control":
      "private, max-age=300, stale-while-revalidate=600",
    Vary: "Authorization, Cookie",
  };
};

export async function GET(req: NextRequest) {
  const rateLimit = getRateLimit();
  const requestId = crypto.randomUUID().slice(0, 8);

  try {
    const { userId } = await auth();
    const { searchParams } = new URL(req.url);
    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      link_slug: searchParams.get("link_slug") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid params" },
        { status: 400, headers: getAnalyticsCacheHeaders(false) },
      );
    }
    const { range, link_slug } = parsed.data;
    const scopeUserId = link_slug ? undefined : (userId ?? undefined);
    if (!link_slug && !scopeUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: getAnalyticsCacheHeaders(false) },
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = `overview:${scopeUserId || "anon"}:${link_slug || "all"}:${ip}`;
    const {
      success,
      limit: rlLimit,
      remaining,
    } = await rateLimit.limit(identifier);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests", limit: rlLimit, remaining },
        { status: 429, headers: getAnalyticsCacheHeaders(false) },
      );
    }

    const { start, end } = getUtcRange(range as AnalyticsRange);
    const start_date = formatForTinybird(start);
    const end_date = formatForTinybird(end);

    // Reuse timeseries pipe and reduce totals here
    const ts = await tinybirdFetch<{
      data: Array<{
        bucket_start: string;
        clicks: number;
        unique_sessions: number;
        new_sessions: number;
        human_clicks: number;
        bot_clicks: number;
        avg_latency: number | null;
      }>;
    }>("timeseries", {
      start_date,
      end_date,
      link_slug,
      user_id: scopeUserId,
    });

    const totals = ts.data.reduce(
      (acc, row) => {
        acc.clicks += row.clicks;
        acc.unique_sessions += row.unique_sessions;
        acc.new_sessions += row.new_sessions;
        acc.human_clicks += row.human_clicks;
        acc.bot_clicks += row.bot_clicks;
        if (row.avg_latency != null) {
          acc._latencySum += row.avg_latency;
          acc._latencyCount += 1;
        }
        return acc;
      },
      {
        clicks: 0,
        unique_sessions: 0,
        new_sessions: 0,
        human_clicks: 0,
        bot_clicks: 0,
        _latencySum: 0,
        _latencyCount: 0,
      },
    );
    const avg_latency =
      totals._latencyCount > 0
        ? totals._latencySum / totals._latencyCount
        : null;

    const res = NextResponse.json({
      data: {
        clicks: totals.clicks,
        unique_sessions: totals.unique_sessions,
        new_sessions: totals.new_sessions,
        human_clicks: totals.human_clicks,
        bot_clicks: totals.bot_clicks,
        avg_latency,
      },
    });

    // Apply optimized cache headers
    const cacheHeaders = getAnalyticsCacheHeaders(!!scopeUserId);
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });

    console.log(
      `[${requestId}] Analytics overview cached with headers:`,
      cacheHeaders,
    );

    return res;
  } catch (e: unknown) {
    console.error("Analytics overview error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 502, headers: getAnalyticsCacheHeaders(false) },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getRateLimit } from "@/lib/rateLimit";
import { AnalyticsRange, getUtcRange } from "@/lib/analyticsRanges";

// Strip /analytics/v2 suffix to get base URL if present, but we specifically need /analytics/v2 here
// process.env.INTERNAL_API_URL is typically http://host:port/api or http://host:port/api/analytics/v2
// We'll normalize to the base API user and append /analytics/v2
const BASE_API_URL = (process.env.INTERNAL_API_URL || "").replace(
  /\/analytics\/v2$/,
  "",
);
const API_SECRET = process.env.API_SECRET;

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
  link_id: z.string().min(1),
  endpoint: z.enum(["performance", "timeseries"]).default("performance"),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();
    const { userId: clerkUserId, sessionClaims } = await auth();
    const { searchParams } = new URL(req.url);

    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      link_id: searchParams.get("link_id") ?? undefined,
      endpoint: searchParams.get("endpoint") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { range, link_id, endpoint } = parsed.data;

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract convex_user_id from session claims
    const convexUserId = (sessionClaims as Record<string, unknown>)
      ?.convex_user_id as string | undefined;

    if (!convexUserId) {
      return NextResponse.json(
        { error: "Session not configured. Please log out and log back in." },
        { status: 401 },
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = `variants:${clerkUserId}:${link_id}:${ip}`;
    const {
      success,
      limit: rlLimit,
      remaining,
    } = await rateLimit.limit(identifier);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests", limit: rlLimit, remaining },
        { status: 429 },
      );
    }

    // Convert range to start/end dates
    const { start, end } = getUtcRange(range as AnalyticsRange);
    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    // Build backend URL
    // Endpoint: /analytics/v2/analytics/variants/:linkId or /analytics/v2/analytics/variants/:linkId/timeseries
    // Wait, check server.ts: app.route('/analytics/v2', analyticsV2);
    // analyticsV2 router: router.get('/variants/:linkId', ...)
    // So full path is BASE/analytics/v2/variants/:linkId

    let backendPath = `/analytics/v2/variants/${link_id}`;
    if (endpoint === "timeseries") {
      backendPath += "/timeseries";
    }

    const backendUrl = new URL(`${BASE_API_URL}${backendPath}`);
    backendUrl.searchParams.set("start", startDate);
    backendUrl.searchParams.set("end", endDate);

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": convexUserId || "",
        Authorization: `Bearer ${API_SECRET}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch variant data" },
        { status: response.status },
      );
    }

    const result = await response.json();
    const res = NextResponse.json(result);
    // Cache for 60s
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res;
  } catch (e: unknown) {
    console.error("Variant analytics error:", e);
    if (e instanceof Error) {
      return NextResponse.json({ error: e.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 502 });
  }
}

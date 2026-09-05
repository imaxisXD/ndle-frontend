import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getRateLimit } from "@/lib/rateLimit";
import { AnalyticsRange, getUtcRange } from "@/lib/analyticsRanges";
import { getRangeAccessError } from "@/lib/analytics-access";
import {
  getSignedInAnalyticsViewer,
  ANALYTICS_READ_TIMEOUT_MS,
} from "@/lib/server-analytics-plan";

// Strip /analytics/v2 suffix to get base URL
const INTERNAL_API_URL = (process.env.INTERNAL_API_URL || "").replace(
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
  link_slug: z.string().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();
    const { userId: clerkUserId, getToken } = await auth();
    const { searchParams } = new URL(req.url);
    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      link_slug: searchParams.get("link_slug") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }
    const { range, link_slug, limit } = parsed.data;

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = `traffic:${clerkUserId}:${link_slug || "all"}`;
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

    const viewer = await getSignedInAnalyticsViewer(getToken);
    if (!viewer)
      return NextResponse.json(
        {
          error:
            "Your account is still being prepared. Please try again shortly.",
        },
        { status: 503 },
      );
    const convexUserId = viewer.userId;

    const rangeError = getRangeAccessError(range, viewer.plan);
    if (rangeError) {
      return NextResponse.json({ error: rangeError }, { status: 403 });
    }

    // Convert range to start/end dates
    const { start, end } = getUtcRange(range as AnalyticsRange);
    const startDate = start.toISOString().split("T")[0];
    const endDate = end.toISOString().split("T")[0];

    // Build backend URL
    const backendUrl = new URL(`${INTERNAL_API_URL}/analytics/unified`);
    backendUrl.searchParams.set("endpoint", "traffic-sources");
    backendUrl.searchParams.set("start", startDate);
    backendUrl.searchParams.set("end", endDate);
    backendUrl.searchParams.set("limit", String(limit));
    if (link_slug) {
      backendUrl.searchParams.set("link_slug", link_slug);
    }

    const response = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": convexUserId,
        Authorization: `Bearer ${API_SECRET}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(ANALYTICS_READ_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", response.status, errorText);
      return NextResponse.json(
        { error: "Failed to fetch analytics data" },
        { status: response.status },
      );
    }

    const result = await response.json();
    const res = NextResponse.json({ data: result.data });
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch {
    return NextResponse.json(
      {
        error:
          "Analytics is temporarily unavailable. Please try again shortly.",
      },
      { status: 502 },
    );
  }
}

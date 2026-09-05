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
  bypass_cache: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional()
    .default(false),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();
    const { userId, getToken } = await auth();
    const { searchParams } = new URL(req.url);

    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      link_slug: searchParams.get("link_slug") ?? undefined,
      bypass_cache: searchParams.get("bypass_cache") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { range, link_slug } = parsed.data;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const identifier = `dashboard:${userId}:${link_slug || "all"}`;
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

    if (!INTERNAL_API_URL || !API_SECRET) {
      return NextResponse.json(
        { error: "Configuration error" },
        { status: 500 },
      );
    }

    const { start, end } = getUtcRange(range as AnalyticsRange);
    const backendUrl = new URL(`${INTERNAL_API_URL}/analytics/unified`);
    backendUrl.searchParams.set("endpoint", "timeseries");
    backendUrl.searchParams.set("start", start.toISOString().split("T")[0]);
    backendUrl.searchParams.set("end", end.toISOString().split("T")[0]);
    if (link_slug) backendUrl.searchParams.set("link_slug", link_slug);

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
      return NextResponse.json(
        { error: "Failed to fetch dashboard analytics" },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ time: string; clicks: number }>;
    };
    const timeseries = payload.data ?? [];
    const totalClicks = timeseries.reduce(
      (sum, item) => sum + (item.clicks ?? 0),
      0,
    );

    const res = NextResponse.json({
      data: {
        totalClicks,
        timeseries,
      },
    });

    res.headers.set("Cache-Control", "private, no-store");

    return res;
  } catch (e: unknown) {
    console.error("Dashboard analytics error:", e);
    return NextResponse.json(
      {
        error:
          "Analytics is temporarily unavailable. Please try again shortly.",
      },
      { status: 502 },
    );
  }
}

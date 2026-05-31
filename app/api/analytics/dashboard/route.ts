import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getRateLimit } from "@/lib/rateLimit";
import { AnalyticsRange, getUtcRange } from "@/lib/analyticsRanges";
import { getRangeAccessError } from "@/lib/analytics-access";

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
    const { userId, sessionClaims } = await auth();
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

    const convexUserId = (sessionClaims as Record<string, unknown>)
      ?.convex_user_id as string | undefined;
    if (!convexUserId) {
      return NextResponse.json(
        { error: "Session not configured. Please log out and log back in." },
        { status: 401 },
      );
    }

    const rangeError = getRangeAccessError(range, sessionClaims);
    if (rangeError) {
      return NextResponse.json({ error: rangeError }, { status: 403 });
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

    if (!INTERNAL_API_URL || !API_SECRET) {
      return NextResponse.json({ error: "Configuration error" }, { status: 500 });
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
    const totalClicks = timeseries.reduce((sum, item) => sum + (item.clicks ?? 0), 0);

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
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 502 },
    );
  }
}

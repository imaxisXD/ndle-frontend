import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getRateLimit } from "@/lib/rateLimit";
import { AnalyticsRange, getUtcRange } from "@/lib/analyticsRanges";

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
  dimension: z.enum(["browser", "device", "os", "country"]),
  link_slug: z.string().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();
    const { userId: clerkUserId, sessionClaims } = await auth();
    const { searchParams } = new URL(req.url);
    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      dimension: searchParams.get("dimension") ?? undefined,
      link_slug: searchParams.get("link_slug") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }
    const { range, dimension, link_slug, limit } = parsed.data;

    const scopeUserId = link_slug ? undefined : (clerkUserId ?? undefined);
    if (!link_slug && !scopeUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract convex_user_id from session claims
    const convexUserId = (sessionClaims as Record<string, unknown>)
      ?.convex_user_id as string | undefined;
    if (!convexUserId && !link_slug) {
      return NextResponse.json(
        { error: "Session not configured. Please log out and log back in." },
        { status: 401 },
      );
    }

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = `breakdown:${dimension}:${scopeUserId || "anon"}:${link_slug || "all"}:${ip}`;
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
    const backendUrl = new URL(`${INTERNAL_API_URL}/analytics/unified`);
    backendUrl.searchParams.set("endpoint", "breakdown");
    backendUrl.searchParams.set("start", startDate);
    backendUrl.searchParams.set("end", endDate);
    backendUrl.searchParams.set("dimension", dimension);
    backendUrl.searchParams.set("limit", String(limit));
    if (link_slug) {
      backendUrl.searchParams.set("link_slug", link_slug);
    }
    console.log(backendUrl);
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
        { error: "Failed to fetch analytics data" },
        { status: response.status },
      );
    }

    const result = await response.json();
    const res = NextResponse.json({ data: result.data });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res;
  } catch (e: unknown) {
    console.error("Breakdown error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 502 },
    );
  }
}

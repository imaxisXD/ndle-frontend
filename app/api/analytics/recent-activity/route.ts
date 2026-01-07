import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getRateLimit } from "@/lib/rateLimit";

const INTERNAL_API_URL = (process.env.INTERNAL_API_URL || "").replace(
  /\/analytics\/v2$/,
  "",
);
const API_SECRET = process.env.API_SECRET;

const schema = z.object({
  link_slug: z.string().min(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();
    const { userId: clerkUserId, sessionClaims } = await auth();
    const { searchParams } = new URL(req.url);

    const parsed = schema.safeParse({
      link_slug: searchParams.get("link_slug") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "link_slug required" },
        { status: 400 },
      );
    }

    const { link_slug, limit } = parsed.data;

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
    const identifier = `recent-activity:${clerkUserId || "anon"}:${link_slug}:${ip}`;
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

    // Build backend URL
    const backendUrl = new URL(`${INTERNAL_API_URL}/analytics/unified`);
    backendUrl.searchParams.set("endpoint", "recent-activity");
    backendUrl.searchParams.set("link_slug", link_slug);
    backendUrl.searchParams.set("limit", String(limit));

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
        { error: "Failed to fetch recent activity" },
        { status: response.status },
      );
    }

    const result = await response.json();
    const res = NextResponse.json({ data: result.data });
    // Short cache - 10 seconds
    res.headers.set("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
    return res;
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 502 },
    );
  }
}

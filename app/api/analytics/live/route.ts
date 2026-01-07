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
  link_slug: z.string().min(1).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();
    const { userId: clerkUserId, sessionClaims } = await auth();
    const { searchParams } = new URL(req.url);

    const parsed = schema.safeParse({
      link_slug: searchParams.get("link_slug") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { link_slug } = parsed.data;

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
    const identifier = `live:${scopeUserId || "anon"}:${link_slug || "all"}:${ip}`;
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
    backendUrl.searchParams.set("endpoint", "live");
    if (link_slug) {
      backendUrl.searchParams.set("link_slug", link_slug);
    }

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
        { error: "Failed to fetch live events" },
        { status: response.status },
      );
    }

    const result = await response.json();
    const res = NextResponse.json({ data: result.data });
    // Short cache for live data - 5 seconds
    res.headers.set("Cache-Control", "s-maxage=5, stale-while-revalidate=10");
    return res;
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 502 },
    );
  }
}

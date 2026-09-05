import {
  getSignedInAnalyticsViewer,
  ANALYTICS_READ_TIMEOUT_MS,
} from "@/lib/server-analytics-plan";
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
    const { userId: clerkUserId, getToken } = await auth();
    const { searchParams } = new URL(req.url);

    const parsed = schema.safeParse({
      link_slug: searchParams.get("link_slug") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { link_slug } = parsed.data;

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = `live:${clerkUserId}:${link_slug || "all"}`;
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
        { error: "Failed to fetch live events" },
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

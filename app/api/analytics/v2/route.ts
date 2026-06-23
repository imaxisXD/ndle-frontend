import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import type { AnalyticsV2Response } from "@/types/analytics-v2";
import { getDateWindowAccessError } from "@/lib/analytics-access";
import { getRateLimit } from "@/lib/rateLimit";
import { getSignedInUserPlan } from "@/lib/server-analytics-plan";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL;
const API_SECRET = process.env.API_SECRET;
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  });

export async function GET(request: NextRequest) {
  const t0 = performance.now();

  // 1. AUTH: Require Clerk authentication and extract convex_user_id from JWT claims
  // Security: The convex_user_id comes from signed JWT claims, NOT from a spoofable header
  // This requires Clerk session template: { "convex_user_id": "{{user.public_metadata.convex_user_id}}" }
  const { userId: clerkUserId, sessionClaims, getToken } = await auth();
  const t1 = performance.now();
  console.log(`[Perf] Clerk auth(): ${(t1 - t0).toFixed(2)}ms`);

  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Extract convex_user_id from JWT session claims (set via Clerk's session template)
  const convexUserId = (sessionClaims as Record<string, unknown>)
    ?.convex_user_id as string | undefined;

  if (!convexUserId) {
    console.warn(
      "[AnalyticsV2] Missing convex_user_id in session claims - user may need to re-login",
    );
    return NextResponse.json(
      { error: "Session not configured. Please log out and log back in." },
      { status: 401 },
    );
  }

  // 2. INPUT: Parse Query Parameters (Date Range)
  const { searchParams } = new URL(request.url);
  const parsedDates = z
    .object({ start: dateSchema, end: dateSchema })
    .refine((value) => value.start <= value.end, {
      message: "Invalid date range",
    })
    .safeParse({
      start: searchParams.get("start"),
      end: searchParams.get("end"),
    });
  if (!parsedDates.success) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  const { start, end } = parsedDates.data;
  const rateLimit = getRateLimit();
  const {
    success,
    limit: rlLimit,
    remaining,
  } = await rateLimit.limit(`analytics-v2:${clerkUserId}`);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests", limit: rlLimit, remaining },
      { status: 429 },
    );
  }

  let rangeError = getDateWindowAccessError(start, end);
  if (rangeError) {
    const viewerPlan = await getSignedInUserPlan(getToken);
    rangeError = getDateWindowAccessError(start, end, viewerPlan);
  }
  if (rangeError) {
    return NextResponse.json({ error: rangeError }, { status: 403 });
  }
  console.log("📈 [AnalyticsV2] Incoming request", {
    start,
    end,
    clerkUserId,
    convexUserId,
  });

  // 3. PROXY: Call the Backend Service (Private Network)
  try {
    if (!INTERNAL_API_URL || !API_SECRET) {
      console.error("❌ [AnalyticsV2] Missing INTERNAL_API_URL env var");
      throw new Error("Configuration Error");
    }
    console.log("📡 [AnalyticsV2] Targeting backend", INTERNAL_API_URL);
    const targetUrl = new URL(INTERNAL_API_URL);
    targetUrl.searchParams.set("start", start);
    targetUrl.searchParams.set("end", end);
    console.log("🛰️ [AnalyticsV2] Final URL", targetUrl.toString());

    const t2 = performance.now();
    const response = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": convexUserId,
        Authorization: `Bearer ${API_SECRET}`,
      },
      cache: "no-store",
    });
    const t3 = performance.now();
    console.log(`[Perf] Ingest Service fetch: ${(t3 - t2).toFixed(2)}ms`);

    if (!response.ok) {
      // Clone response to read body text without consuming it for other potential uses
      const errorText = await response.text();
      console.error(
        "⚠️ [AnalyticsV2] Backend API Error",
        response.status,
        response.statusText,
        errorText,
      );

      // Try to parse as JSON to forward clean error message
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorJson.error || "Failed to fetch analytics data." },
          { status: response.status },
        );
      } catch {
        // Fallback if not JSON
        return NextResponse.json(
          { error: `Failed to fetch analytics data: ${response.statusText}` },
          { status: response.status },
        );
      }
    }

    const data: AnalyticsV2Response = await response.json();
    console.log("✅ [AnalyticsV2] Payload received", {
      coldFiles: data.meta.files_count,
      totalClicks: data.totalClicks,
    });
    const res = NextResponse.json(data);
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (error) {
    console.error("🔥 [AnalyticsV2] Proxy Failed", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

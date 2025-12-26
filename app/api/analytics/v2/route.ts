import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { AnalyticsResponse } from "@/types/analytics-v2";

const INTERNAL_API_URL = process.env.INTERNAL_API_URL;
const API_SECRET = process.env.API_SECRET;

export async function GET(request: NextRequest) {
  const t0 = performance.now();

  // 1. AUTH: Require Clerk authentication and extract convex_user_id from JWT claims
  // Security: The convex_user_id comes from signed JWT claims, NOT from a spoofable header
  // This requires Clerk session template: { "convex_user_id": "{{user.public_metadata.convex_user_id}}" }
  const { userId: clerkUserId, sessionClaims } = await auth();
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
  const start = searchParams.get("start"); // e.g. "2025-11-20"
  const end = searchParams.get("end"); // e.g. "2025-11-22"
  console.log("📈 [AnalyticsV2] Incoming request", {
    start,
    end,
    clerkUserId,
    convexUserId,
  });

  // Validate minimal inputs
  if (!start || !end) {
    return NextResponse.json(
      { error: "Missing date range parameters" },
      { status: 400 },
    );
  }

  // 3. PROXY: Call the Backend Service (Private Network)
  try {
    if (!INTERNAL_API_URL) {
      console.error("❌ [AnalyticsV2] Missing INTERNAL_API_URL env var");
      throw new Error("Configuration Error");
    }
    console.log("📡 [AnalyticsV2] Targeting backend", INTERNAL_API_URL);
    const targetUrl = `${INTERNAL_API_URL}?start=${start}&end=${end}`;
    console.log("🛰️ [AnalyticsV2] Final URL", targetUrl);

    const t2 = performance.now();
    const response = await fetch(targetUrl, {
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
          { error: errorJson.error || "Failed to fetch analytics data" },
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

    const data: AnalyticsResponse = await response.json();
    console.log("✅ [AnalyticsV2] Payload received", {
      hotCount: data.meta.hot_count,
      coldFiles: data.meta.files_count,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("🔥 [AnalyticsV2] Proxy Failed", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

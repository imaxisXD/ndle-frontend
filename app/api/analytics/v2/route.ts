import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getDateWindowAccessError } from "@/lib/analytics-access";
import { getRateLimit } from "@/lib/rateLimit";
import { getSignedInAnalyticsViewer } from "@/lib/server-analytics-plan";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
const inputSchema = z.object({ start: dateSchema, end: dateSchema,
  country: z.string().max(200).optional(), device: z.string().max(200).optional(),
  browser: z.string().max(200).optional(), os: z.string().max(200).optional(),
  link: z.string().max(2048).optional(), includeFiles: z.enum(["true", "false"]).optional(), excludeBots: z.enum(["true", "false"]).optional(),
}).refine(value => value.start <= value.end);

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view analytics" }, { status: 401 });
  const parsed = inputSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid analytics filters or date range" }, { status: 400 });
  const today = new Date().toISOString().slice(0, 10);
  const input = { ...parsed.data, end: parsed.data.end > today ? today : parsed.data.end };
  if (input.start > input.end) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  const rate = await getRateLimit().limit(`analytics-v2:${userId}`);
  if (!rate.success) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  const viewer = await getSignedInAnalyticsViewer(getToken);
  if (!viewer) return NextResponse.json({ error: "Your account is getting ready. Try again shortly." }, { status: 503 });
  const rangeError = getDateWindowAccessError(input.start, input.end, viewer.plan);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 403 });
  try {
    const endpoint = process.env.INTERNAL_API_URL;
    const secret = process.env.API_SECRET;
    if (!endpoint || !secret) throw new Error("Analytics service is not configured");
    const target = new URL(endpoint);
    for (const [key, value] of Object.entries(input)) if (value !== undefined && value !== "all") target.searchParams.set(key, value);
    const response = await fetch(target, { headers: { "x-user-id": viewer.userId, Authorization: `Bearer ${secret}` },
      cache: "no-store", signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return NextResponse.json({ error: "Analytics could not load. Try again shortly." }, { status: response.status >= 500 ? 503 : response.status });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[Analytics] Could not load analytics", error instanceof Error ? error.message : "Service error");
    return NextResponse.json({ error: "Analytics is temporarily unavailable. Try again shortly." }, { status: 503 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getRateLimit } from "@/lib/rateLimit";
import { tinybirdFetch } from "@/lib/tinybird";
import {
  AnalyticsRange,
  getUtcRange,
  formatForTinybird,
} from "@/lib/analyticsRanges";

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
  dimension: z.enum(["browser", "device", "os", "country", "datacenter"]),
  link_slug: z.string().min(1).optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();

    const { userId } = await auth();
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

    const scopeUserId = link_slug ? undefined : (userId ?? undefined);
    if (!link_slug && !scopeUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { start, end } = getUtcRange(range as AnalyticsRange);
    const start_date = formatForTinybird(start);
    const end_date = formatForTinybird(end);

    type BreakdownRow = {
      label: string | null;
      clicks: number;
      unique_sessions: number;
      new_sessions: number;
      human_clicks: number;
      bot_clicks: number;
      avg_latency: number | null;
    };
    const data = await tinybirdFetch<{ data: BreakdownRow[] }>(
      "optimized_breakdown",
      {
        start_date,
        end_date,
        dimension,
        link_slug,
        user_id: scopeUserId,
        limit,
      },
    );
    console.log("Breakdown data", data);
    const res = NextResponse.json({ data: data.data });

    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res;
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 502 },
    );
  }
}

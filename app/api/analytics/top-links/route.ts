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
  limit: z.coerce.number().min(1).max(50).default(10),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }
    const { range, limit } = parsed.data;

    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = `toplinks:${userId}:${ip}`;
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

    type TopLinkRow = {
      link_slug: string;
      clicks: number;
      unique_sessions: number;
    };
    const data = await tinybirdFetch<{ data: TopLinkRow[] }>("top_links", {
      start_date,
      end_date,
      user_id: userId,
      limit,
    });

    const res = NextResponse.json({ data: data.data });
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res;
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 502 },
    );
  }
}

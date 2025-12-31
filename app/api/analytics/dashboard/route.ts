import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { getRateLimit } from "@/lib/rateLimit";

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
    .default("false"),
});

export async function GET(req: NextRequest) {
  try {
    const rateLimit = getRateLimit();
    const { userId } = await auth();
    const { searchParams } = new URL(req.url);

    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      link_slug: searchParams.get("link_slug") ?? undefined,
      bypass_cache: searchParams.get("bypass_cache") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { link_slug } = parsed.data;

    // Require authentication for link-specific or user-wide analytics
    const scopeUserId = link_slug ? undefined : (userId ?? undefined);
    if (!link_slug && !scopeUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use userId for scoped queries, otherwise require userId
    const effectiveUserId = scopeUserId || userId;
    if (!effectiveUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const identifier = `dashboard:${effectiveUserId}:${link_slug || "all"}:${ip}`;
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

    // Call Convex action
    // const data = await fetchAction(api.analyticsCache.getDashboardAnalytics, {
    //   userId: effectiveUserId,
    //   range,
    //   linkSlug: link_slug,
    //   bypassCache: bypass_cache,
    // });

    const res = NextResponse.json({ data: {} });

    // Add cache headers for CDN/browser caching
    res.headers.set("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

    return res;
  } catch (e: unknown) {
    console.error("Dashboard analytics error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 502 },
    );
  }
}

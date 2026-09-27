import { ShardedCounter } from "@convex-dev/sharded-counter";
import { ConvexError, v } from "convex/values";
import { components, internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

/* One number for the landing page: every click ndle has counted.
 *
 * Each recorded click also bumps a sharded platform counter. A cron copies
 * that counter into a single publicStats row once a minute, and the row is
 * all the public query reads. So the public surface is one small document
 * with no per-link or per-user data, and a burst of clicks (real or not)
 * never fans out to every open landing page. */

const PLATFORM_CLICKS = "platform-clicks";
const CLICKS_STAT = "clicks";

// Every click in the product lands on this key, so it gets more shards than
// the per-link counters.
const platformCounter = new ShardedCounter(components.shardedCounter, {
  shards: { [PLATFORM_CLICKS]: 32 },
});
const linkCounter = new ShardedCounter(components.shardedCounter);

async function clicksRow(ctx: QueryCtx) {
  return await ctx.db
    .query("publicStats")
    .withIndex("by_name", (q) => q.eq("name", CLICKS_STAT))
    .unique();
}

/** Called once per recorded click, next to the link's own counter. */
export async function recordPlatformClick(ctx: MutationCtx) {
  await platformCounter.inc(ctx, PLATFORM_CLICKS);
}

/** The landing page's live counter. Null until the total has been seeded from existing links. */
export const getLiveClickTotal = query({
  args: {},
  returns: v.union(v.null(), v.object({ total: v.number(), updatedAt: v.number() })),
  handler: async (ctx) => {
    const row = await clicksRow(ctx);
    if (!row?.seededAt) return null;
    return { total: row.total, updatedAt: row.updatedAt };
  },
});

/** Cron: copy the platform counter into the public row, writing only when it moved. */
export const refresh = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const total = await platformCounter.count(ctx, PLATFORM_CLICKS);
    const row = await clicksRow(ctx);
    if (!row) {
      await ctx.db.insert("publicStats", { name: CLICKS_STAT, total, updatedAt: Date.now() });
    } else if (row.total !== total) {
      await ctx.db.patch(row._id, { total, updatedAt: Date.now() });
    }
    return null;
  },
});

export const readPlatformClicks = internalQuery({
  args: {},
  returns: v.number(),
  handler: async (ctx) => await platformCounter.count(ctx, PLATFORM_CLICKS),
});

export const sumLinkClicksPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.object({ sum: v.number(), cursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.query("urls").order("asc").paginate({ numItems: 100, cursor });
    let sum = 0;
    for (const url of page.page) sum += await linkCounter.count(ctx, `url:${url._id}`);
    return { sum, cursor: page.continueCursor, isDone: page.isDone };
  },
});

export const applySeed = internalMutation({
  args: { linkClicks: v.number(), platformAtStart: v.number() },
  returns: v.number(),
  handler: async (ctx, { linkClicks, platformAtStart }) => {
    const row = await clicksRow(ctx);
    if (row?.seededAt) throw new ConvexError("The public click total is already seeded");
    // Clicks recorded since the platform counter shipped are already inside
    // the link counters, so only the ones that landed during the seed are kept.
    await platformCounter.add(ctx, PLATFORM_CLICKS, linkClicks - platformAtStart);
    const total = await platformCounter.count(ctx, PLATFORM_CLICKS);
    const now = Date.now();
    if (row) await ctx.db.patch(row._id, { total, updatedAt: now, seededAt: now });
    else await ctx.db.insert("publicStats", { name: CLICKS_STAT, total, updatedAt: now, seededAt: now });
    return total;
  },
});

/**
 * One-off, run by hand once per deployment: `npx convex run publicStats:seed`.
 * Sums every link's click counter into the platform total, then turns the
 * public counter on. Counting happens in queries so it never blocks clicks.
 */
export const seed = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const platformAtStart: number = await ctx.runQuery(internal.publicStats.readPlatformClicks, {});
    let linkClicks = 0;
    let cursor: string | null = null;
    for (;;) {
      const page: { sum: number; cursor: string; isDone: boolean } = await ctx.runQuery(
        internal.publicStats.sumLinkClicksPage,
        { cursor },
      );
      linkClicks += page.sum;
      if (page.isDone) break;
      cursor = page.cursor;
    }
    const total: number = await ctx.runMutation(internal.publicStats.applySeed, { linkClicks, platformAtStart });
    return total;
  },
});

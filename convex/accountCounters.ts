import { ShardedCounter } from "@convex-dev/sharded-counter";
import { components } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const accountCounter = new ShardedCounter(components.shardedCounter);

/** Each link contributes exactly once, including clicks received during migration. */
export async function includeLinkInAccount(ctx: MutationCtx, url: Doc<"urls">, userId = url.userTableId) {
  if (url.accountCountersIncluded) return;
  if (userId) {
    await accountCounter.add(ctx, `user-clicks:${userId}`, await accountCounter.count(ctx, `url:${url._id}`));
    await accountCounter.inc(ctx, `user-links:${userId}`);
  }
  await ctx.db.patch(url._id, { accountCountersIncluded: true });
}

export async function transferGuestLinkToAccount(ctx: MutationCtx, url: Doc<"urls">, userId: Id<"users">) {
  if (url.userTableId === userId) return;
  await accountCounter.add(ctx, `user-clicks:${userId}`, await accountCounter.count(ctx, `url:${url._id}`));
  await accountCounter.inc(ctx, `user-links:${userId}`);
  await ctx.db.patch(url._id, { accountCountersIncluded: true });
}

export async function removeLinkFromAccount(ctx: MutationCtx, url: Doc<"urls">) {
  if (!url.accountCountersIncluded || !url.userTableId) return;
  await accountCounter.add(ctx, `user-clicks:${url.userTableId}`, -await accountCounter.count(ctx, `url:${url._id}`));
  await accountCounter.add(ctx, `user-links:${url.userTableId}`, -1);
}

export async function accountCountsReady(ctx: QueryCtx, userId: Id<"users">) {
  const pending = await ctx.db.query("urls").withIndex("by_user_and_accountCountersIncluded", q =>
    q.eq("userTableId", userId).eq("accountCountersIncluded", undefined)).first();
  return !pending;
}

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { includeLinkInAccount } from "./accountCounters";
import { queueServiceSync, queueUrlSync } from "./serviceSync";
import { makeGuestOwnerKey, makeUserOwnerKey } from "./ownership";

/** Bounded, resumable compatibility migration. Source history is never rewritten. */
export const advance = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const urls = await ctx.db.query("urls").withIndex("by_accountCountersIncluded", q => q.eq("accountCountersIncluded", undefined)).take(25);
    for (const url of urls) {
      await includeLinkInAccount(ctx, url);
      await queueUrlSync(ctx, url);
    }
    const users = await ctx.db.query("users").withIndex("by_externalSyncReady", q => q.eq("externalSyncReady", undefined)).take(25);
    for (const user of users) {
      await queueServiceSync(ctx, `owner:${user._id}`, { kind: "owner", userId: user._id, ownerKeys: [user._id, makeUserOwnerKey(user._id)] });
      const clerkUserId = user.tokenIdentifier.split("|").at(-1);
      if (clerkUserId?.startsWith("user_")) await queueServiceSync(ctx, `clerk:${user._id}`, { kind: "clerk", userId: user._id, clerkUserId });
      await ctx.db.patch(user._id, { externalSyncReady: true });
    }
    const sessions = await ctx.db.query("guest_sessions").withIndex("by_ownerAliasSynced", q => q.eq("ownerAliasSynced", undefined)).take(25);
    for (const session of sessions) {
      if (session.claimedUserId) await queueServiceSync(ctx, `owner:${session.claimedUserId}:${makeGuestOwnerKey(session.guestId)}`, { kind: "owner", userId: session.claimedUserId, ownerKeys: [makeGuestOwnerKey(session.guestId)] });
      await ctx.db.patch(session._id, { ownerAliasSynced: true });
    }
    return null;
  },
});

/** Receipts outlive the accepted retry window; live activity has an explicit 30-day lifetime. */
export const trimLiveHistory = internalMutation({
  args: {}, returns: v.null(),
  handler: async ctx => {
    const now = Date.now();
    const clicks = await ctx.db.query("clickEvents").withIndex("by_occurredAt", q => q.lt("occurredAt", now - 30 * 86_400_000)).take(250);
    const receipts = await ctx.db.query("processedClickRequests").withIndex("by_createdAt", q => q.lt("createdAt", now - 35 * 86_400_000)).take(250);
    const healthReceipts = await ctx.db.query("processedHealthChecks").withIndex("by_createdAt", q => q.lt("createdAt", now - 35 * 86_400_000)).take(250);
    for (const row of [...clicks, ...receipts, ...healthReceipts]) await ctx.db.delete(row._id);
    if ([clicks, receipts, healthReceipts].some(rows => rows.length === 250)) {
      await ctx.scheduler.runAfter(0, internal.architectureMigration.trimLiveHistory, {});
    }
    return null;
  },
});

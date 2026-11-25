import type { Infer } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import type { serviceSyncTarget } from "./serviceSyncTypes";

export type SyncTarget = Infer<typeof serviceSyncTarget>;

/** Save desired state in the same transaction as the user's change. */
export async function queueServiceSync(ctx: MutationCtx, key: string, target: SyncTarget) {
  const previous = await ctx.db
    .query("serviceSyncJobs")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const now = Date.now();
  const version = Math.max(now, (previous?.version ?? 0) + 1);
  if (previous?.target.kind === "owner" && target.kind === "owner") {
    target = {
      ...target,
      ownerKeys: [...new Set([...previous.target.ownerKeys, ...target.ownerKeys])],
    };
  }
  const running = previous?.status === "running" && previous.nextAttemptAt > now;
  const change = {
    key,
    target,
    version,
    status: running ? ("running" as const) : ("pending" as const),
    attempts: 0,
    nextAttemptAt: running ? previous.nextAttemptAt : now,
    updatedAt: now,
    lastError: undefined,
    runningVersion: running ? previous.runningVersion : undefined,
  };
  const jobId = previous?._id ?? (await ctx.db.insert("serviceSyncJobs", change));
  if (previous) await ctx.db.patch(previous._id, change);
  if (!running)
    await ctx.scheduler.runAfter(0, internal.serviceSync.run, {
      jobId,
      version,
    });
  return version;
}

export async function queueUrlSync(ctx: MutationCtx, url: Doc<"urls">) {
  await queueServiceSync(ctx, `redirect:${url.slugAssigned ?? url.shortUrl}`, {
    kind: "redirect",
    urlId: url._id,
    slug: url.slugAssigned ?? url.shortUrl,
  });
  await queueServiceSync(ctx, `monitor:${url._id}`, {
    kind: "monitor",
    urlId: url._id,
  });
}

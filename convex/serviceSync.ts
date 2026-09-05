import { Redis } from "@upstash/redis";
import { v, type Infer } from "convex/values";
import { doc } from "convex-helpers/validators";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  type MutationCtx,
} from "./_generated/server";
import schema from "./schema";
import { serviceSyncTarget } from "./serviceSyncTypes";
import { buildRedirectProjection } from "./redisProjection";
import { getOwnerSnapshot, getViewerPlan } from "./ownership";
import { deliverMonitoringChange } from "./linkHealth";
import { deliverDomainChange, deliverLegacyDomainDeletion } from "./domainSync";

const RUN_LEASE_MS = 11 * 60_000;
type SyncTarget = Infer<typeof serviceSyncTarget>;

export const enqueue = internalMutation({
  args: { key: v.string(), target: serviceSyncTarget },
  returns: v.number(),
  handler: async (ctx, { key, target }) => queueServiceSync(ctx, key, target),
});

/** Save desired state in the same transaction as the user's change. */
export async function queueServiceSync(
  ctx: MutationCtx,
  key: string,
  target: SyncTarget,
) {
  const previous = await ctx.db
    .query("serviceSyncJobs")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  const now = Date.now();
  const version = Math.max(now, (previous?.version ?? 0) + 1);
  if (previous?.target.kind === "owner" && target.kind === "owner") {
    target = {
      ...target,
      ownerKeys: [
        ...new Set([...previous.target.ownerKeys, ...target.ownerKeys]),
      ],
    };
  }
  const running =
    previous?.status === "running" && previous.nextAttemptAt > now;
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
  const jobId =
    previous?._id ?? (await ctx.db.insert("serviceSyncJobs", change));
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

const runArgs = { jobId: v.id("serviceSyncJobs"), version: v.number() };
const claimResult = v.union(
  v.null(),
  v.object({
    job: doc(schema, "serviceSyncJobs"),
    url: v.union(doc(schema, "urls"), v.null()),
    user: v.union(doc(schema, "users"), v.null()),
  }),
);

export const claim = internalMutation({
  args: runArgs,
  returns: claimResult,
  handler: async (ctx, { jobId, version }) => {
    const job = await ctx.db.get(jobId);
    const now = Date.now();
    if (
      !job ||
      job.version !== version ||
      job.status === "complete" ||
      job.nextAttemptAt > now
    )
      return null;
    let target = job.target;
    let url: Doc<"urls"> | null = null;
    if (target.kind === "redirect") {
      const slug = target.slug;
      // Legacy actions can hold an ID from before this slug was reused.
      url = await ctx.db
        .query("urls")
        .withIndex("by_slug", (q) => q.eq("slugAssigned", slug))
        .unique();
      if (!url) {
        const original = await ctx.db.get(target.urlId);
        // Older rows may only have shortUrl. Never revive an ID under another slug.
        if (original && (original.slugAssigned ?? original.shortUrl) === slug)
          url = original;
      }
      if (url) target = { ...target, urlId: url._id };
    } else if (target.kind === "monitor") {
      url = await ctx.db.get(target.urlId);
    }
    await ctx.db.patch(jobId, {
      target,
      status: "running",
      runningVersion: version,
      nextAttemptAt: now + RUN_LEASE_MS,
      updatedAt: now,
      attempts: job.attempts + 1,
    });
    const user =
      target.kind === "owner" || target.kind === "clerk"
        ? await ctx.db.get(target.userId)
        : null;
    return { job: { ...job, target }, url, user };
  },
});

export const finish = internalMutation({
  args: { ...runArgs, error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { jobId, version, error }) => {
    const job = await ctx.db.get(jobId);
    if (!job || job.runningVersion !== version) return null;
    const now = Date.now();
    const superseded = job.version !== version;
    const delay =
      error && !superseded
        ? Math.min(3_600_000, 5_000 * 2 ** Math.min(job.attempts, 10))
        : 0;
    const pending = superseded || !!error;
    await ctx.db.patch(jobId, {
      status: pending ? "pending" : "complete",
      runningVersion: undefined,
      nextAttemptAt: now + delay,
      updatedAt: now,
      lastError: superseded ? undefined : error,
    });
    if (pending) {
      await ctx.scheduler.runAfter(delay, internal.serviceSync.run, {
        jobId,
        version: job.version,
      });
    } else if (job.target.kind === "clerk") {
      if (await ctx.db.get(job.target.userId))
        await ctx.db.patch(job.target.userId, { metadataSyncedAt: now });
    } else if (job.target.kind === "redirect") {
      if (await ctx.db.get(job.target.urlId))
        await ctx.db.patch(job.target.urlId, {
          redisStatus: "OK",
          urlStatusMessage: "success",
        });
    }
    return null;
  },
});

/** The revision key survives a deletion, so delayed writes cannot revive a link. */
export const REDIRECT_SYNC_SCRIPT = `
local previous = tonumber(redis.call('GET', KEYS[2]) or '0')
local current = tonumber(ARGV[1])
if previous > current then return 0 end
if ARGV[2] == '' then redis.call('DEL', KEYS[1])
else redis.call('JSON.SET', KEYS[1], '$', ARGV[2]) end
redis.call('SET', KEYS[2], ARGV[1])
return 1`;

export function redirectValue(url: Doc<"urls">) {
  const variants = url.abVariants?.map((variant, index) => ({
    ...variant,
    id: `variant_${index}`,
  }));
  const abVariants = variants?.length
    ? [
        {
          id: "control",
          url: url.fullurl,
          weight: Math.max(
            0,
            100 - variants.reduce((sum, item) => sum + item.weight, 0),
          ),
        },
        ...variants,
      ]
    : undefined;
  return buildRedirectProjection({
    fullUrl: url.fullurl,
    docId: url._id,
    analyticsOwnerKey: getOwnerSnapshot(url).analyticsOwnerKey,
    convexUserId: url.userTableId,
    trackingEnabled: url.trackingEnabled,
    expiresAt: url.expiresAt,
    utmSource: url.utmSource,
    utmMedium: url.utmMedium,
    utmCampaign: url.utmCampaign,
    utmTerm: url.utmTerm,
    utmContent: url.utmContent,
    abEnabled: url.abEnabled,
    abVariants,
    abDistribution: "deterministic",
  });
}

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to sync this change`);
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function send(
  url: string,
  secret: string,
  method: string,
  body: unknown,
): Promise<unknown> {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (response.status !== 200)
    throw new Error(`Service rejected the update (${response.status})`);
  try {
    return await response.json();
  } catch {
    throw new Error("Service returned an invalid update confirmation");
  }
}

export const run = internalAction({
  args: runArgs,
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const state: Infer<typeof claimResult> = await ctx.runMutation(
      internal.serviceSync.claim,
      args,
    );
    if (!state) return null;
    const { job, url, user } = state;
    try {
      const target = job.target;
      switch (target.kind) {
        case "redirect": {
          const redis = new Redis({
            url: required("UPSTASH_REDIS_REST_URL"),
            token: required("UPSTASH_REDIS_REST_TOKEN"),
            retry: { retries: 0 },
          });
          await redis.eval(
            REDIRECT_SYNC_SCRIPT,
            [target.slug, `ndle:sync:${target.slug}`],
            [
              String(job.version),
              url ? JSON.stringify(redirectValue(url)) : "",
            ],
          );
          break;
        }
        case "monitor":
          await deliverMonitoringChange({
            convexUrlId: target.urlId,
            monitoringVersion: job.version,
            registration: url?.userTableId
              ? {
                  convexUserId: url.userTableId,
                  longUrl: url.fullurl,
                  shortUrl: url.slugAssigned ?? url.shortUrl,
                }
              : undefined,
          });
          break;
        case "owner": {
          if (user) {
            const result = await send(
              `${required("INTERNAL_API_URL")
                .replace(/\/analytics\/v2\/?$/, "")
                .replace(/\/$/, "")}/internal/owner-aliases`,
              required("API_SECRET"),
              "POST",
              { accountUserId: target.userId, ownerKeys: target.ownerKeys },
            );
            if (!isObject(result) || result.success !== true)
              throw new Error(
                "Analytics service did not confirm the account update",
              );
          }
          break;
        }
        case "clerk": {
          if (user) {
            const plan = getViewerPlan(user.membership);
            const result = await send(
              `https://api.clerk.com/v1/users/${encodeURIComponent(target.clerkUserId)}/metadata`,
              required("CLERK_SECRET_KEY"),
              "PATCH",
              {
                public_metadata: {
                  convex_user_id: user._id,
                  membership: plan,
                  plan,
                },
              },
            );
            if (
              !isObject(result) ||
              result.id !== target.clerkUserId ||
              !isObject(result.public_metadata) ||
              result.public_metadata.convex_user_id !== user._id ||
              result.public_metadata.membership !== plan ||
              result.public_metadata.plan !== plan
            ) {
              throw new Error(
                "Clerk did not confirm the requested account metadata",
              );
            }
          }
          break;
        }
        case "domain":
          await deliverDomainChange(ctx, target);
          break;
        case "domain_lookup":
          await deliverLegacyDomainDeletion(ctx, target.hostnameId);
          break;
      }
      await ctx.runMutation(internal.serviceSync.finish, args);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Service update failed";
      await ctx.runMutation(internal.serviceSync.finish, {
        ...args,
        error: message.slice(0, 500),
      });
    }
    return null;
  },
});

/** Recover interrupted actions; refresh completed projections to repair external drift. */
export const reconcile = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    for (const status of ["pending", "running", "complete"] as const) {
      const due = await ctx.db
        .query("serviceSyncJobs")
        .withIndex("by_status_and_nextAttemptAt", (q) =>
          q
            .eq("status", status)
            .lte(
              "nextAttemptAt",
              status === "complete" ? now - 86_400_000 : now,
            ),
        )
        .take(25);
      for (const job of due) {
        await ctx.db.patch(job._id, {
          status: "pending",
          runningVersion: undefined,
          nextAttemptAt: now,
          updatedAt: now,
        });
        await ctx.scheduler.runAfter(0, internal.serviceSync.run, {
          jobId: job._id,
          version: job.version,
        });
      }
    }
    return null;
  },
});

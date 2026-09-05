import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalAction,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { getOwnerSnapshot } from "./ownership";
import { getCurrentUser } from "./users";
import schema from "./schema";

const BATCH_SIZE = 100;
const PRODUCTION_MONITORING_INTERVAL_MS = 30 * 60 * 1000;
const DAY_MS = 86400_000;
const healthStatusValidator = v.union(
  v.literal("up"),
  v.literal("down"),
  v.literal("degraded"),
  v.literal("unknown"),
);
const monitoringActionResultValidator = v.object({
  success: v.literal(true),
  status: v.union(
    v.literal("registered"),
    v.literal("unregistered"),
    v.literal("disabled_for_development"),
    v.literal("queued"),
  ),
});
const recordHealthCheckResultValidator = v.union(
  v.object({ success: v.literal(true) }),
  v.object({ success: v.literal(false), reason: v.literal("url_not_found") }),
);

function getMonitoringEnvironment(): "dev" | "prod" {
  return process.env.ENVIRONMENT === "prod" ? "prod" : "dev";
}

export async function deliverMonitoringChange(args: {
  convexUrlId: string;
  monitoringVersion: number;
  registration?: { convexUserId: string; longUrl: string; shortUrl: string };
}): Promise<void> {
  const environment = getMonitoringEnvironment();
  if (environment === "dev" && args.registration) return;
  const address = process.env.MONITOR_SERVICE_URL;
  const secret = process.env.MONITORING_API_SECRET;
  if (!address || !secret)
    throw new Error("Monitoring service address and secret are required");
  const response = await fetch(
    `${address}/monitors/${args.registration ? "register" : "unregister"}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        convexUrlId: args.convexUrlId,
        monitoringVersion: args.monitoringVersion,
        environment,
        ...(args.registration
          ? {
              ...args.registration,
              intervalMs: PRODUCTION_MONITORING_INTERVAL_MS,
            }
          : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!response.ok)
    throw new Error(`Monitoring update failed (HTTP ${response.status})`);
  const receipt: unknown = await response.json();
  if (
    !receipt ||
    typeof receipt !== "object" ||
    !("success" in receipt) ||
    receipt.success !== true ||
    !("monitoringVersion" in receipt) ||
    typeof receipt.monitoringVersion !== "number" ||
    !Number.isSafeInteger(receipt.monitoringVersion) ||
    receipt.monitoringVersion < args.monitoringVersion ||
    !("isDeleted" in receipt) ||
    typeof receipt.isDeleted !== "boolean" ||
    (receipt.monitoringVersion === args.monitoringVersion &&
      receipt.isDeleted !== !args.registration)
  ) {
    throw new Error("Monitoring service did not confirm the saved change");
  }
}

export const getAllUrlsQuery = internalQuery({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    numItems: v.optional(v.number()),
  },
  returns: v.object({
    urls: v.array(
      v.object({
        urlId: v.id("urls"),
        userId: v.id("users"),
        shortUrl: v.string(),
        longUrl: v.string(),
      }),
    ),
    continueCursor: v.union(v.string(), v.null()),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("urls")
      .order("asc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: Math.min(
          BATCH_SIZE,
          Math.max(1, args.numItems ?? BATCH_SIZE),
        ),
      });
    const urls = result.page.flatMap((url) =>
      url.userTableId
        ? [
            {
              urlId: url._id,
              userId: url.userTableId,
              shortUrl: url.slugAssigned ?? url.shortUrl,
              longUrl: url.fullurl,
            },
          ]
        : [],
    );
    return {
      urls,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const syncAllUrlsToMonitoringService = internalAction({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.object({
    success: v.literal(true),
    totalSynced: v.number(),
    batchCount: v.number(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ success: true; totalSynced: number; batchCount: number }> => {
    if (getMonitoringEnvironment() === "dev")
      return { success: true, totalSynced: 0, batchCount: 0 };
    const result = await ctx.runQuery(internal.linkHealth.getAllUrlsQuery, {
      cursor: args.cursor,
      numItems: BATCH_SIZE,
    });
    for (const url of result.urls)
      await ctx.runMutation(internal.serviceSync.enqueue, {
        key: `monitor:${url.urlId}`,
        target: { kind: "monitor", urlId: url.urlId },
      });
    if (!result.isDone)
      await ctx.scheduler.runAfter(
        0,
        internal.linkHealth.syncAllUrlsToMonitoringService,
        { cursor: result.continueCursor },
      );
    return {
      success: true,
      totalSynced: result.urls.length,
      batchCount: result.urls.length ? 1 : 0,
    };
  },
});

export const registerUrlWithMonitoringService = internalAction({
  args: {
    convexUrlId: v.id("urls"),
    convexUserId: v.id("users"),
    longUrl: v.string(),
    shortUrl: v.string(),
    monitoringVersion: v.optional(v.number()),
  },
  returns: monitoringActionResultValidator,
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.serviceSync.enqueue, {
      key: `monitor:${args.convexUrlId}`,
      target: { kind: "monitor", urlId: args.convexUrlId },
    });
    return { success: true, status: "queued" } as const;
  },
});

export const unregisterUrlFromMonitoringService = internalAction({
  args: {
    convexUrlId: v.id("urls"),
    monitoringVersion: v.optional(v.number()),
  },
  returns: monitoringActionResultValidator,
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.serviceSync.enqueue, {
      key: `monitor:${args.convexUrlId}`,
      target: { kind: "monitor", urlId: args.convexUrlId },
    });
    return { success: true, status: "queued" } as const;
  },
});

export const recordHealthCheck = mutation({
  args: {
    sharedSecret: v.string(),
    checkId: v.optional(v.string()),
    monitoringVersion: v.optional(v.number()),
    urlId: v.id("urls"),
    shortUrl: v.string(),
    longUrl: v.string(),
    statusCode: v.number(),
    latencyMs: v.number(),
    isHealthy: v.boolean(),
    healthStatus: v.union(
      v.literal("up"),
      v.literal("down"),
      v.literal("degraded"),
      v.literal("unknown"),
    ),
    errorMessage: v.optional(v.string()),
    checkedAt: v.number(),
  },
  returns: recordHealthCheckResultValidator,
  handler: async (ctx, args) => {
    const {
      sharedSecret,
      urlId,
      shortUrl,
      statusCode,
      latencyMs,
      isHealthy,
      healthStatus,
      errorMessage,
      checkedAt,
    } = args;

    const validSecrets = [process.env.MONITORING_SHARED_SECRET].filter(Boolean);

    if (!validSecrets.includes(sharedSecret)) {
      console.error("[Link Monitoring] | Invalid shared secret");
      throw new Error("[Link Monitoring] | Invalid shared secret");
    }

    const urlDoc = await ctx.db.get(urlId);
    if (!urlDoc) {
      return { success: false, reason: "url_not_found" } as const;
    }
    const syncJob = await ctx.db
      .query("serviceSyncJobs")
      .withIndex("by_key", (q) => q.eq("key", `monitor:${urlId}`))
      .unique();
    if (syncJob && (args.monitoringVersion ?? 0) < syncJob.version)
      return { success: true } as const;
    const now = Date.now();
    if (!Number.isFinite(checkedAt) || checkedAt > now + 60_000)
      throw new Error("Check time is invalid");
    if (
      !Number.isFinite(latencyMs) ||
      latencyMs < 0 ||
      !Number.isFinite(statusCode)
    )
      throw new Error("Check result is invalid");
    if (checkedAt < now - 35 * DAY_MS) return { success: true } as const;
    const checkId =
      args.checkId ??
      `legacy:${urlId}:${checkedAt}:${statusCode}:${healthStatus}:${latencyMs}`;
    const receipt = await ctx.db
      .query("processedHealthChecks")
      .withIndex("by_checkId", (q) => q.eq("checkId", checkId))
      .unique();
    if (receipt) return { success: true } as const;
    await ctx.db.insert("processedHealthChecks", {
      checkId,
      urlId,
      checkedAt,
      createdAt: now,
    });
    const owner = getOwnerSnapshot(urlDoc);

    // 1. Get previous check to detect status changes
    const previousCheck = await ctx.db
      .query("linkHealthChecks")
      .withIndex("by_url_id", (q) => q.eq("urlId", urlId))
      .unique();

    const isNewer = !previousCheck || checkedAt > previousCheck.checkedAt;
    const previousStatus =
      previousCheck?.lastKnownHealthStatus ?? previousCheck?.healthStatus;
    const isUnknown = healthStatus === "unknown";
    const wasHealthy = previousStatus === "up";
    const isNowHealthy = healthStatus === "up";

    // 2. Upsert linkHealthChecks (latest status)
    if (previousCheck && isNewer) {
      await ctx.db.patch(previousCheck._id, {
        checkId,
        monitoringVersion: args.monitoringVersion,
        lastKnownHealthStatus: isUnknown
          ? (previousCheck.lastKnownHealthStatus ??
            (previousCheck.healthStatus === "unknown"
              ? undefined
              : previousCheck.healthStatus))
          : healthStatus,
        shortUrl: urlDoc.slugAssigned ?? urlDoc.shortUrl,
        longUrl: urlDoc.fullurl,
        userId: owner.userId,
        guestId: owner.guestId,
        analyticsOwnerKey: owner.analyticsOwnerKey,
        checkedAt,
        statusCode,
        latencyMs,
        isHealthy,
        healthStatus,
        errorMessage,
      });
    } else if (!previousCheck) {
      await ctx.db.insert("linkHealthChecks", {
        checkId,
        monitoringVersion: args.monitoringVersion,
        lastKnownHealthStatus: isUnknown ? undefined : healthStatus,
        urlId,
        userId: owner.userId,
        guestId: owner.guestId,
        analyticsOwnerKey: owner.analyticsOwnerKey,
        shortUrl: urlDoc.slugAssigned ?? urlDoc.shortUrl,
        longUrl: urlDoc.fullurl,
        statusCode,
        latencyMs,
        isHealthy,
        healthStatus,
        errorMessage,
        checkedAt,
      });
    }

    // 3. Update daily summary (rollup)
    const today = new Date(checkedAt).toISOString().split("T")[0];
    const isIncident =
      isNewer &&
      !isUnknown &&
      !isNowHealthy &&
      (wasHealthy || !previousStatus || previousStatus === "unknown");

    const existingSummary = await ctx.db
      .query("linkHealthDailySummary")
      .withIndex("by_url_and_date", (q) =>
        q.eq("urlId", urlId).eq("date", today),
      )
      .unique();

    if (existingSummary) {
      const newTotal = existingSummary.totalChecks + 1;
      await ctx.db.patch(existingSummary._id, {
        userId: owner.userId,
        guestId: owner.guestId,
        analyticsOwnerKey: owner.analyticsOwnerKey,
        totalChecks: newTotal,
        unknownChecks:
          (existingSummary.unknownChecks ?? 0) + (isUnknown ? 1 : 0),
        healthyChecks: existingSummary.healthyChecks + (isNowHealthy ? 1 : 0),
        avgLatencyMs: Math.round(
          (existingSummary.avgLatencyMs * existingSummary.totalChecks +
            latencyMs) /
            newTotal,
        ),
        incidentCount: existingSummary.incidentCount + (isIncident ? 1 : 0),
      });
    } else {
      await ctx.db.insert("linkHealthDailySummary", {
        urlId,
        userId: owner.userId,
        guestId: owner.guestId,
        analyticsOwnerKey: owner.analyticsOwnerKey,
        date: today,
        totalChecks: 1,
        unknownChecks: isUnknown ? 1 : 0,
        healthyChecks: isNowHealthy ? 1 : 0,
        avgLatencyMs: latencyMs,
        incidentCount: isIncident ? 1 : 0,
      });
    }

    // 4. Create incident events on status changes
    const isFirstCheck = !previousStatus || previousStatus === "unknown";
    const statusWentDown =
      (wasHealthy && !isNowHealthy) || (isFirstCheck && !isNowHealthy);
    const statusRecovered =
      (previousStatus === "down" || previousStatus === "degraded") &&
      isNowHealthy;

    // Generate user-friendly incident messages
    const getUserFriendlyMessage = (): string => {
      if (healthStatus === "down") {
        // Error messages based on status code
        if (statusCode >= 500) {
          return "The destination server is experiencing issues and isn't responding properly.";
        }
        if (statusCode === 404) {
          return "The destination page could not be found. It may have been moved or deleted.";
        }
        if (statusCode === 403) {
          return "Access to the destination was blocked. The site may have security restrictions.";
        }
        if (statusCode === 401) {
          return "The destination requires authentication to access.";
        }
        if (statusCode === 0 || !statusCode) {
          if (
            errorMessage?.includes("abort") ||
            errorMessage?.includes("timeout")
          ) {
            return "The destination took too long to respond and the request timed out.";
          }
          return "Unable to reach the destination. It may be offline or unreachable.";
        }
        return `The destination returned an error (HTTP ${statusCode}).`;
      }

      if (healthStatus === "degraded") {
        return "The destination is responding slower than expected. Performance may be affected.";
      }

      return "An issue was detected with the link.";
    };

    if (isNewer && !isUnknown && statusWentDown) {
      // Status went DOWN or DEGRADED (including first-time checks that are unhealthy)
      const message = isFirstCheck
        ? `Initial check failed: ${getUserFriendlyMessage()}`
        : getUserFriendlyMessage();

      await ctx.db.insert("linkIncidents", {
        urlId,
        userId: owner.userId,
        guestId: owner.guestId,
        analyticsOwnerKey: owner.analyticsOwnerKey,
        shortUrl,
        type: healthStatus === "down" ? "error" : "warning",
        message,
        createdAt: checkedAt,
      });
    } else if (isNewer && !isUnknown && statusRecovered) {
      // Status RECOVERED
      await ctx.db.insert("linkIncidents", {
        urlId,
        userId: owner.userId,
        guestId: owner.guestId,
        analyticsOwnerKey: owner.analyticsOwnerKey,
        shortUrl,
        type: "resolved",
        message: "Your link is back online and responding normally.",
        createdAt: checkedAt,
      });
    }

    return { success: true } as const;
  },
});

const monitoringRowValidator = v.object({
  _id: v.id("urls"),
  urlId: v.id("urls"),
  shortUrl: v.string(),
  longUrl: v.string(),
  checkedAt: v.union(v.number(), v.null()),
  healthStatus: v.union(healthStatusValidator, v.null()),
  latencyMs: v.number(),
  uptime: v.union(v.number(), v.null()),
  incidents: v.number(),
});
const healthDocumentValidator = v.object({
  _id: v.id("linkHealthChecks"),
  _creationTime: v.number(),
  ...schema.tables.linkHealthChecks.validator.fields,
});
const summaryDocumentValidator = v.object({
  _id: v.id("linkHealthDailySummary"),
  _creationTime: v.number(),
  ...schema.tables.linkHealthDailySummary.validator.fields,
});
const incidentDocumentValidator = v.object({
  _id: v.id("linkIncidents"),
  _creationTime: v.number(),
  ...schema.tables.linkIncidents.validator.fields,
});

async function monitoringRows(
  ctx: QueryCtx,
  urls: Doc<"urls">[],
  now?: number,
) {
  return Promise.all(
    urls.map(async (url) => {
      const check = await ctx.db
        .query("linkHealthChecks")
        .withIndex("by_url_id", (q) => q.eq("urlId", url._id))
        .unique();
      // Legacy callers without an explicit clock get a window ending at their last sample.
      const end = now ?? check?.checkedAt ?? url._creationTime;
      const since = new Date(end - 29 * DAY_MS).toISOString().slice(0, 10);
      const today = new Date(end).toISOString().slice(0, 10);
      const summaries = await ctx.db
        .query("linkHealthDailySummary")
        .withIndex("by_url_and_date", (q) =>
          q.eq("urlId", url._id).gte("date", since).lte("date", today),
        )
        .take(30);
      const known = summaries.reduce(
        (total, row) => total + row.totalChecks - (row.unknownChecks ?? 0),
        0,
      );
      const healthy = summaries.reduce(
        (total, row) => total + row.healthyChecks,
        0,
      );
      return {
        _id: url._id,
        urlId: url._id,
        shortUrl: url.slugAssigned ?? url.shortUrl,
        longUrl: url.fullurl,
        checkedAt: check?.checkedAt ?? null,
        healthStatus: check?.healthStatus ?? null,
        latencyMs: check?.latencyMs ?? 0,
        uptime: known > 0 ? Math.round((healthy / known) * 1000) / 10 : null,
        incidents: summaries.reduce(
          (total, row) => total + row.incidentCount,
          0,
        ),
      };
    }),
  );
}

export const getHealthChecksWithStats = query({
  args: { now: v.optional(v.number()), limit: v.optional(v.number()) },
  returns: v.array(monitoringRowValidator),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const urls = await ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .order("desc")
      .take(Math.min(100, Math.max(1, args.limit ?? 100)));
    return monitoringRows(ctx, urls, args.now);
  },
});

export const getMonitoringPage = query({
  args: { paginationOpts: paginationOptsValidator, now: v.number() },
  returns: v.object({
    page: v.array(monitoringRowValidator),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], continueCursor: "", isDone: true };
    const result = await ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    return {
      page: await monitoringRows(ctx, result.page, args.now),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const getRecentIncidents = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(incidentDocumentValidator),
  handler: async (ctx, { limit = 10 }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    const rows = await ctx.db
      .query("linkIncidents")
      .withIndex("by_user_recent", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(Math.min(100, Math.max(1, limit)));
    const live = await Promise.all(
      rows.map(async (incident) => {
        const url = await ctx.db.get(incident.urlId);
        return url?.userTableId === user._id ? incident : null;
      }),
    );
    return live.filter(
      (incident): incident is NonNullable<typeof incident> => incident !== null,
    );
  },
});

export const getHealthandIncidentsDataForUrl = query({
  args: { urlId: v.id("urls"), now: v.optional(v.number()) },
  returns: v.union(
    v.null(),
    v.object({
      healthData: v.union(healthDocumentValidator, v.null()),
      incidentData: v.array(incidentDocumentValidator),
      dailySummaries: v.array(summaryDocumentValidator),
      hasMoreIncidents: v.boolean(),
    }),
  ),
  handler: async (ctx, { urlId, now }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const url = await ctx.db.get(urlId);
    if (!url || url.userTableId !== user._id) return null;
    const healthData = await ctx.db
      .query("linkHealthChecks")
      .withIndex("by_url_id", (q) => q.eq("urlId", urlId))
      .unique();
    const end = now ?? healthData?.checkedAt ?? url._creationTime;
    const since = new Date(end - 29 * DAY_MS).toISOString().slice(0, 10);
    const today = new Date(end).toISOString().slice(0, 10);
    const incidents = await ctx.db
      .query("linkIncidents")
      .withIndex("by_url_id", (q) => q.eq("urlId", urlId))
      .order("desc")
      .take(101);
    const dailySummaries = await ctx.db
      .query("linkHealthDailySummary")
      .withIndex("by_url_and_date", (q) =>
        q.eq("urlId", urlId).gte("date", since).lte("date", today),
      )
      .take(30);
    return {
      healthData,
      incidentData: incidents.slice(0, 100),
      dailySummaries,
      hasMoreIncidents: incidents.length > 100,
    };
  },
});

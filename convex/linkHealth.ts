import { v } from "convex/values";
import { internalAction, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";

const BATCH_SIZE = 100;

// Type for URL data returned from the query
type UrlData = {
  urlId: string;
  userId: string;
  shortUrl: string;
  longUrl: string;
};

type PaginatedUrlResult = {
  urls: UrlData[];
  continueCursor: string | null;
  isDone: boolean;
};

/**
 * Internal query to get URLs with pagination
 */
export const getAllUrlsQuery = internalQuery({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const numItems = args.numItems ?? BATCH_SIZE;

    const urlsQuery = ctx.db.query("urls").order("asc");

    const paginatedResults = await urlsQuery.paginate({
      cursor: args.cursor ?? null,
      numItems,
    });

    const urls = paginatedResults.page.map((url) => ({
      urlId: url._id,
      userId: url.userTableId,
      shortUrl: url.slugAssigned ?? "",
      longUrl: url.fullurl,
    }));

    return {
      urls,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
    };
  },
});

/**
 * Sync all URLs from Convex DB to the link monitoring service
 * This action fetches all URLs and sends them to the /monitors/batch endpoint
 */
export const syncAllUrlsToMonitoringService = internalAction({
  args: {},
  handler: async (ctx) => {
    const monitoringServiceUrl = process.env.MONITOR_SERVICE_URL;
    const monitoringApiSecret = process.env.MONITORING_API_SECRET;
    const environment = process.env.ENVIRONMENT;

    if (!monitoringServiceUrl) {
      throw new Error("MONITORING_SERVICE_URL environment variable is not set");
    }

    if (!monitoringApiSecret) {
      throw new Error("MONITORING_API_SECRET environment variable is not set");
    }

    let cursor: string | null = null;
    let totalSynced = 0;
    let batchNumber = 0;

    do {
      const result: PaginatedUrlResult = await ctx.runQuery(
        internal.linkHealth.getAllUrlsQuery,
        { cursor, numItems: BATCH_SIZE },
      );
      // REsponse body expected format
      //  const links: NewMonitoredLink[] = body.links.map(link => ({
      //       convexUrlId: link.convexUrlId,
      //       convexUserId: link.convexUserId,
      //       longUrl: link.longUrl,
      //       shortUrl: link.shortUrl,
      //       environment: body.environment || 'prod',
      //       intervalMs: link.intervalMs || DEFAULT_INTERVAL_MS,
      //       nextCheckAt: new Date(),
      //       isActive: true,
      //     }));

      const links = result.urls.map((url) => ({
        convexUrlId: url.urlId,
        convexUserId: url.userId,
        shortUrl: url.shortUrl,
        longUrl: url.longUrl,
        environment,
        intervalMs: 300000,
      }));

      if (links.length > 0) {
        const response = await fetch(`${monitoringServiceUrl}/monitors/batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${monitoringApiSecret}`,
          },
          body: JSON.stringify({ links }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to sync batch ${batchNumber}: ${response.status} - ${errorText}`,
          );
        }

        const batchResult = (await response.json()) as { inserted: number };
        totalSynced += batchResult.inserted || links.length;
        batchNumber++;

        console.log(
          `[Sync] Batch ${batchNumber}: Sent ${links.length} links, inserted ${batchResult.inserted}`,
        );
      }

      cursor = result.isDone ? null : result.continueCursor;
    } while (cursor);

    console.log(
      `[Sync] Complete: Synced ${totalSynced} URLs in ${batchNumber} batches`,
    );

    return { success: true, totalSynced, batchCount: batchNumber };
  },
});

export const recordHealthCheck = mutation({
  args: {
    sharedSecret: v.string(),
    urlId: v.string(),
    userId: v.string(),
    shortUrl: v.string(),
    longUrl: v.string(),
    statusCode: v.number(),
    latencyMs: v.number(),
    isHealthy: v.boolean(),
    healthStatus: v.union(
      v.literal("up"),
      v.literal("down"),
      v.literal("degraded"),
    ),
    errorMessage: v.optional(v.string()),
    checkedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const {
      sharedSecret,
      urlId,
      userId,
      shortUrl,
      longUrl,
      statusCode,
      latencyMs,
      isHealthy,
      healthStatus,
      errorMessage,
      checkedAt,
    } = args;

    if (sharedSecret !== process.env.MONITORING_SHARED_SECRET) {
      console.error("[Link Monitoring] | Invalid shared secret");
      throw new Error("[Link Monitoring] | Invalid shared secret");
    }

    const normalizedUrl = ctx.db.normalizeId("urls", urlId);
    const normalizedUser = ctx.db.normalizeId("users", userId);

    if (!normalizedUrl || !normalizedUser) {
      console.error("[Link Monitoring] | Invalid URL or User ID");
      throw new Error("[Link Monitoring] | Invalid URL or User ID");
    }

    // 1. Get previous check to detect status changes
    const previousCheck = await ctx.db
      .query("linkHealthChecks")
      .withIndex("by_url_id", (q) => q.eq("urlId", normalizedUrl))
      .unique();

    const previousStatus = previousCheck?.healthStatus;
    const wasHealthy = previousStatus === "up";
    const isNowHealthy = healthStatus === "up";

    // 2. Upsert linkHealthChecks (latest status)
    if (previousCheck) {
      await ctx.db.patch(previousCheck._id, {
        checkedAt,
        statusCode,
        latencyMs,
        isHealthy,
        healthStatus,
        errorMessage,
      });
    } else {
      await ctx.db.insert("linkHealthChecks", {
        urlId: normalizedUrl,
        userId: normalizedUser,
        shortUrl,
        longUrl,
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
    const isIncident = wasHealthy && !isNowHealthy;

    const existingSummary = await ctx.db
      .query("linkHealthDailySummary")
      .withIndex("by_url_and_date", (q) =>
        q.eq("urlId", normalizedUrl).eq("date", today),
      )
      .unique();

    if (existingSummary) {
      const newTotal = existingSummary.totalChecks + 1;
      await ctx.db.patch(existingSummary._id, {
        totalChecks: newTotal,
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
        urlId: normalizedUrl,
        userId: normalizedUser,
        date: today,
        totalChecks: 1,
        healthyChecks: isNowHealthy ? 1 : 0,
        avgLatencyMs: latencyMs,
        incidentCount: isIncident ? 1 : 0,
      });
    }

    // 4. Create incident events on status changes
    if (wasHealthy && !isNowHealthy) {
      // Status went DOWN or DEGRADED
      await ctx.db.insert("linkIncidents", {
        urlId: normalizedUrl,
        userId: normalizedUser,
        shortUrl,
        type: healthStatus === "down" ? "error" : "warning",
        message: errorMessage || `Status: ${healthStatus} (HTTP ${statusCode})`,
        createdAt: checkedAt,
      });
    } else if (!wasHealthy && isNowHealthy && previousCheck) {
      // Status RECOVERED
      await ctx.db.insert("linkIncidents", {
        urlId: normalizedUrl,
        userId: normalizedUser,
        shortUrl,
        type: "resolved",
        message: "Connection restored",
        createdAt: checkedAt,
      });
    }

    return { success: true };
  },
});

// =============================================================================
// QUERIES FOR FRONTEND
// =============================================================================

import { query } from "./_generated/server";

/**
 * Get all health checks for current user with computed uptime % and incident count
 */
export const getHealthChecksWithStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return [];

    const checks = await ctx.db
      .query("linkHealthChecks")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .collect();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return Promise.all(
      checks.map(async (check) => {
        const summaries = await ctx.db
          .query("linkHealthDailySummary")
          .withIndex("by_url_and_date", (q) =>
            q.eq("urlId", check.urlId).gte("date", thirtyDaysAgo),
          )
          .collect();

        const total = summaries.reduce((s, r) => s + r.totalChecks, 0);
        const healthy = summaries.reduce((s, r) => s + r.healthyChecks, 0);
        const incidents = summaries.reduce((s, r) => s + r.incidentCount, 0);

        return {
          ...check,
          uptime: total > 0 ? Math.round((healthy / total) * 1000) / 10 : 100,
          incidents,
          dailySummaries: summaries,
        };
      }),
    );
  },
});

/**
 * Get recent incidents for "Recent Incidents" section
 */
export const getRecentIncidents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) return [];

    return ctx.db
      .query("linkIncidents")
      .withIndex("by_user_recent", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get daily summaries for a specific URL (for 30-day status bar)
 */
export const getDailySummaries = query({
  args: {
    urlId: v.id("urls"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, { urlId, days = 30 }) => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    return ctx.db
      .query("linkHealthDailySummary")
      .withIndex("by_url_and_date", (q) =>
        q.eq("urlId", urlId).gte("date", since),
      )
      .collect();
  },
});

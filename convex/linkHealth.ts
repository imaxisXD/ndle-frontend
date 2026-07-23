import { v } from "convex/values";
import { internalAction, internalQuery, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getOwnerSnapshot } from "./ownership";

const BATCH_SIZE = 100;
const PRODUCTION_MONITORING_INTERVAL_MS = 30 * 60 * 1000;

const monitoringActionResultValidator = v.union(
  v.object({
    success: v.literal(true),
    status: v.union(
      v.literal("registered"),
      v.literal("unregistered"),
      v.literal("disabled_for_development"),
    ),
  }),
  v.object({
    success: v.literal(false),
    error: v.string(),
  }),
);

const recordHealthCheckResultValidator = v.union(
  v.object({
    success: v.literal(true),
  }),
  v.object({
    success: v.literal(false),
    reason: v.literal("url_not_found"),
  }),
);

function getMonitoringEnvironment(): "dev" | "prod" {
  return process.env.ENVIRONMENT === "prod" ? "prod" : "dev";
}

type MonitoringActionResult =
  | {
      success: true;
      status:
        | "registered"
        | "unregistered"
        | "disabled_for_development";
    }
  | {
      success: false;
      error: string;
    };

type SyncMonitoringResult = {
  success: true;
  totalSynced: number;
  batchCount: number;
};

// Type for URL data returned from the query
type UrlData = {
  urlId: Id<"urls">;
  userId: Id<"users">;
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
    const numItems = args.numItems ?? BATCH_SIZE;

    const urlsQuery = ctx.db.query("urls").order("asc");

    const paginatedResults = await urlsQuery.paginate({
      cursor: args.cursor ?? null,
      numItems,
    });

    const urls = paginatedResults.page
      .map((url) => ({
        urlId: url._id,
        userId: url.userTableId,
        shortUrl: url.slugAssigned ?? "",
        longUrl: url.fullurl,
      }))
      .filter((url) => !!url.userId) as UrlData[];

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
  returns: v.object({
    success: v.literal(true),
    totalSynced: v.number(),
    batchCount: v.number(),
  }),
  handler: async (ctx): Promise<SyncMonitoringResult> => {
    const environment = getMonitoringEnvironment();
    if (environment === "dev") {
      console.log(
        "[Link Monitoring] Continuous development monitoring is disabled",
      );
      return { success: true, totalSynced: 0, batchCount: 0 };
    }

    const monitoringServiceUrl = process.env.MONITOR_SERVICE_URL;
    const monitoringApiSecret = process.env.MONITORING_API_SECRET;

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
        intervalMs: PRODUCTION_MONITORING_INTERVAL_MS,
      }));

      if (links.length > 0) {
        const response = await fetch(`${monitoringServiceUrl}/monitors/batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${monitoringApiSecret}`,
          },
          body: JSON.stringify({ environment, links }),
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

/**
 * Register a single URL with the link monitoring service
 * This is called via scheduler when a new URL is created
 */
export const registerUrlWithMonitoringService = internalAction({
  args: {
    convexUrlId: v.id("urls"),
    convexUserId: v.id("users"),
    longUrl: v.string(),
    shortUrl: v.string(),
  },
  returns: monitoringActionResultValidator,
  handler: async (_ctx, args): Promise<MonitoringActionResult> => {
    const environment = getMonitoringEnvironment();
    if (environment === "dev") {
      return { success: true, status: "disabled_for_development" };
    }

    const monitoringServiceUrl = process.env.MONITOR_SERVICE_URL;
    const monitoringApiSecret = process.env.MONITORING_API_SECRET;

    if (!monitoringServiceUrl) {
      console.error(
        "[Link Monitoring] MONITOR_SERVICE_URL not set, skipping registration",
      );
      return { success: false, error: "MONITOR_SERVICE_URL not configured" };
    }

    if (!monitoringApiSecret) {
      console.error(
        "[Link Monitoring] MONITORING_API_SECRET not set, skipping registration",
      );
      return { success: false, error: "MONITORING_API_SECRET not configured" };
    }

    try {
      const response = await fetch(
        `${monitoringServiceUrl}/monitors/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${monitoringApiSecret}`,
          },
          body: JSON.stringify({
            convexUrlId: args.convexUrlId,
            convexUserId: args.convexUserId,
            longUrl: args.longUrl,
            shortUrl: args.shortUrl,
            environment,
            intervalMs: PRODUCTION_MONITORING_INTERVAL_MS,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Link Monitoring] Registration failed: ${response.status} - ${errorText}`,
        );
        return { success: false, error: errorText };
      }

      console.log(`[Link Monitoring] URL registered: ${args.shortUrl}`);
      return { success: true, status: "registered" };
    } catch (error) {
      console.error("[Link Monitoring] Registration error:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const unregisterUrlFromMonitoringService = internalAction({
  args: {
    convexUrlId: v.id("urls"),
  },
  returns: monitoringActionResultValidator,
  handler: async (_ctx, args): Promise<MonitoringActionResult> => {
    const monitoringServiceUrl = process.env.MONITOR_SERVICE_URL;
    const monitoringApiSecret = process.env.MONITORING_API_SECRET;
    const environment = getMonitoringEnvironment();

    if (!monitoringServiceUrl) {
      return {
        success: false,
        error: "MONITOR_SERVICE_URL not configured",
      } as const;
    }

    if (!monitoringApiSecret) {
      return {
        success: false,
        error: "MONITORING_API_SECRET not configured",
      } as const;
    }

    try {
      const response = await fetch(
        `${monitoringServiceUrl}/monitors/unregister`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${monitoringApiSecret}`,
          },
          body: JSON.stringify({
            convexUrlId: args.convexUrlId,
            environment,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[Link Monitoring] Unregister failed: ${response.status} - ${errorText}`,
        );
        return { success: false, error: errorText };
      }

      return { success: true, status: "unregistered" } as const;
    } catch (error) {
      console.error("[Link Monitoring] Unregister error:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const recordHealthCheck = mutation({
  args: {
    sharedSecret: v.string(),
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
      longUrl,
      statusCode,
      latencyMs,
      isHealthy,
      healthStatus,
      errorMessage,
      checkedAt,
    } = args;

    const validSecrets = [
      process.env.MONITORING_SHARED_SECRET,
      process.env.SHARED_SECRET,
    ].filter(Boolean);

    if (!validSecrets.includes(sharedSecret)) {
      console.error("[Link Monitoring] | Invalid shared secret");
      throw new Error("[Link Monitoring] | Invalid shared secret");
    }

    const urlDoc = await ctx.db.get(urlId);
    if (!urlDoc) {
      return { success: false, reason: "url_not_found" } as const;
    }
    const owner = getOwnerSnapshot(urlDoc);

    // 1. Get previous check to detect status changes
    const previousCheck = await ctx.db
      .query("linkHealthChecks")
      .withIndex("by_url_id", (q) => q.eq("urlId", urlId))
      .unique();

    const previousStatus = previousCheck?.healthStatus;
    const wasHealthy = previousStatus === "up";
    const isNowHealthy = healthStatus === "up";

    // 2. Upsert linkHealthChecks (latest status)
    if (previousCheck) {
      await ctx.db.patch(previousCheck._id, {
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
    } else {
      await ctx.db.insert("linkHealthChecks", {
        urlId,
        userId: owner.userId,
        guestId: owner.guestId,
        analyticsOwnerKey: owner.analyticsOwnerKey,
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
        healthyChecks: isNowHealthy ? 1 : 0,
        avgLatencyMs: latencyMs,
        incidentCount: isIncident ? 1 : 0,
      });
    }

    // 4. Create incident events on status changes
    const isFirstCheck = !previousCheck;
    const statusWentDown =
      (wasHealthy && !isNowHealthy) || (isFirstCheck && !isNowHealthy);
    const statusRecovered = !wasHealthy && isNowHealthy && previousCheck;

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

    if (statusWentDown) {
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
    } else if (statusRecovered) {
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

// =============================================================================
// QUERIES FOR FRONTEND
// =============================================================================

import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

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
// export const getDailySummaries = query({
//   args: {
//     urlId: v.id("urls"),
//     days: v.optional(v.number()),
//   },
//   handler: async (ctx, { urlId, days = 30 }) => {
//     const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
//       .toISOString()
//       .split("T")[0];

//     return ctx.db
//       .query("linkHealthDailySummary")
//       .withIndex("by_url_and_date", (q) =>
//         q.eq("urlId", urlId).gte("date", since),
//       )
//       .collect();
//   },
// });

/**
 * Get all health and incident data for current url with computed uptime % and incident count
 */
export const getHealthandIncidentsDataForUrl = query({
  args: {
    urlId: v.id("urls"),
  },
  handler: async (ctx, { urlId }) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    const url = await ctx.db.get(urlId);

    if (!url || url.userTableId !== user._id) {
      return null;
    }

    const healthData = await ctx.db
      .query("linkHealthChecks")
      .withIndex("by_url_id", (q) => q.eq("urlId", urlId))
      .unique();

    const incidentData = await ctx.db
      .query("linkIncidents")
      .withIndex("by_url_id", (q) => q.eq("urlId", urlId))
      .collect();

    const dailySummaries = await ctx.db
      .query("linkHealthDailySummary")
      .withIndex("by_url_id", (q) => q.eq("urlId", urlId))
      .collect();

    return { healthData, incidentData, dailySummaries };
  },
});

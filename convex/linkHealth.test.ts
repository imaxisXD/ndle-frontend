import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { createTestBackend } from "./test.setup";
import { deliverMonitoringChange, describeIncident } from "./linkHealth";
import { queueServiceSync } from "./serviceSync";
import { getMonitoringStatus } from "../lib/utils";

async function setup() {
  vi.stubEnv("MONITORING_SHARED_SECRET", "monitor-test-only");
  const backend = createTestBackend();
  const identity = { tokenIdentifier: "monitor-user" };
  const { userId, urlId } = await backend.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Test",
      email: "test@example.test",
      membership: "pro",
      tokenIdentifier: identity.tokenIdentifier,
    });
    const urlId = await ctx.db.insert("urls", {
      fullurl: "https://example.test/page",
      shortUrl: "test",
      trackingEnabled: true,
      userTableId: userId,
    });
    return { userId, urlId };
  });
  const client = backend.withIdentity(identity);
  const result = {
    sharedSecret: "monitor-test-only",
    urlId,
    shortUrl: "test",
    longUrl: "https://example.test/page",
    checkedAt: Date.now() - 2000,
    checkId: "first",
    statusCode: 200,
    latencyMs: 10,
    healthStatus: "up" as const,
    isHealthy: true,
  };
  return { backend, client, result, userId, urlId };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("monitor result delivery", () => {
  test("counts duplicate delivery once and older unique checks without rolling back latest status", async () => {
    const { backend, result } = await setup();
    await backend.mutation(api.linkHealth.recordHealthCheck, result);
    await backend.mutation(api.linkHealth.recordHealthCheck, result);
    await backend.mutation(api.linkHealth.recordHealthCheck, {
      ...result,
      checkId: "older",
      checkedAt: result.checkedAt - 1000,
      healthStatus: "down",
      isHealthy: false,
      statusCode: 500,
    });
    const stored = await backend.run(async (ctx) => ({
      checks: await ctx.db.query("linkHealthChecks").collect(),
      summary: await ctx.db.query("linkHealthDailySummary").collect(),
      incidents: await ctx.db.query("linkIncidents").collect(),
      receipts: await ctx.db.query("processedHealthChecks").collect(),
    }));
    expect(stored.checks[0].healthStatus).toBe("up");
    expect(stored.summary[0].totalChecks).toBe(2);
    expect(stored.summary[0].healthyChecks).toBe(1);
    expect(stored.incidents).toHaveLength(0);
    expect(stored.receipts).toHaveLength(2);
  });

  test("unknown checks do not become downtime or fake recovery incidents", async () => {
    const { backend, client, result } = await setup();
    await backend.mutation(api.linkHealth.recordHealthCheck, {
      ...result,
      healthStatus: "unknown",
      isHealthy: false,
      statusCode: 403,
    });
    const unknownPage = await client.query(api.linkHealth.getMonitoringPage, {
      now: Date.now(),
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(unknownPage.page[0].uptime).toBeNull();
    await backend.mutation(api.linkHealth.recordHealthCheck, {
      ...result,
      checkId: "known",
      checkedAt: result.checkedAt + 1000,
    });
    const page = await client.query(api.linkHealth.getMonitoringPage, {
      now: Date.now(),
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(page.page[0].uptime).toBe(100);
    expect(
      await backend.run((ctx) => ctx.db.query("linkIncidents").collect()),
    ).toHaveLength(0);
  });

  test("the first known failure after an unknown result creates one incident", async () => {
    const { backend, result } = await setup();
    await backend.mutation(api.linkHealth.recordHealthCheck, {
      ...result,
      healthStatus: "unknown",
      isHealthy: false,
      statusCode: 403,
    });
    await backend.mutation(api.linkHealth.recordHealthCheck, {
      ...result,
      checkId: "known-down",
      checkedAt: result.checkedAt + 1000,
      healthStatus: "down",
      isHealthy: false,
      statusCode: 500,
    });
    const stored = await backend.run(async (ctx) => ({
      incidents: await ctx.db.query("linkIncidents").collect(),
      summary: await ctx.db.query("linkHealthDailySummary").unique(),
    }));
    expect(stored.incidents).toHaveLength(1);
    expect(stored.summary?.incidentCount).toBe(1);
  });

  test("rejects missing links and ignores superseded monitoring versions", async () => {
    const { backend, result, urlId } = await setup();
    await backend.run((ctx) =>
      ctx.db.insert("serviceSyncJobs", {
        key: `monitor:${urlId}`,
        target: { kind: "monitor", urlId },
        version: 2,
        status: "complete",
        attempts: 0,
        nextAttemptAt: 0,
        updatedAt: Date.now(),
      }),
    );
    await backend.mutation(api.linkHealth.recordHealthCheck, {
      ...result,
      monitoringVersion: 1,
    });
    expect(
      await backend.run((ctx) => ctx.db.query("linkHealthChecks").collect()),
    ).toHaveLength(0);
    await backend.run((ctx) => ctx.db.delete(urlId));
    expect(
      await backend.mutation(api.linkHealth.recordHealthCheck, result),
    ).toEqual({ success: false, reason: "url_not_found" });
  });

  test("deletion hides orphan health rows and pagination includes pending live links", async () => {
    const { backend, client, result, urlId, userId } = await setup();
    await backend.mutation(api.linkHealth.recordHealthCheck, result);
    await backend.run(async (ctx) => {
      await ctx.db.delete(urlId);
      for (let index = 0; index < 3; index++)
        await ctx.db.insert("urls", {
          fullurl: `https://example.test/${index}`,
          shortUrl: `new-${index}`,
          trackingEnabled: true,
          userTableId: userId,
        });
    });
    const first = await client.query(api.linkHealth.getMonitoringPage, {
      now: Date.now(),
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(false);
    expect(
      first.page.every(
        (row) =>
          row.checkedAt === null && row.uptime === null && row.urlId !== urlId,
      ),
    ).toBe(true);
    const second = await client.query(api.linkHealth.getMonitoringPage, {
      now: Date.now(),
      paginationOpts: { numItems: 2, cursor: first.continueCursor },
    });
    expect(second.page).toHaveLength(1);
    expect(second.isDone).toBe(true);
  });

  test("old samples beyond receipt retention are ignored", async () => {
    const { backend, result } = await setup();
    await backend.mutation(api.linkHealth.recordHealthCheck, {
      ...result,
      checkedAt: Date.now() - 36 * 86400_000,
    });
    expect(
      await backend.run((ctx) =>
        ctx.db.query("processedHealthChecks").collect(),
      ),
    ).toHaveLength(0);
  });

  test("failed registration throws so durable sync can retry", async () => {
    const { result, userId } = await setup();
    vi.stubEnv("ENVIRONMENT", "prod");
    vi.stubEnv("MONITOR_SERVICE_URL", "https://monitor.test");
    vi.stubEnv("MONITORING_API_SECRET", "test-only");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    );
    await expect(
      deliverMonitoringChange({
        convexUrlId: result.urlId,
        monitoringVersion: 1,
        registration: {
          convexUserId: userId,
          longUrl: result.longUrl,
          shortUrl: result.shortUrl,
        },
      }),
    ).rejects.toThrow("HTTP 503");
  });

  test("a URL the service can never monitor completes the sync instead of retrying", async () => {
    vi.useFakeTimers();
    const { backend, urlId } = await setup();
    vi.stubEnv("ENVIRONMENT", "prod");
    vi.stubEnv("MONITOR_SERVICE_URL", "https://monitor.test");
    vi.stubEnv("MONITORING_API_SECRET", "test-only");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn<
      (url: string, options?: RequestInit) => Promise<Response>
    >(async () =>
      Response.json(
        {
          success: false,
          code: "invalid_url",
          error: "URL cannot be monitored",
        },
        { status: 400 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const version = await backend.run((ctx) =>
      queueServiceSync(ctx, `monitor:${urlId}`, { kind: "monitor", urlId }),
    );
    const job = await backend.run((ctx) =>
      ctx.db
        .query("serviceSyncJobs")
        .withIndex("by_key", (q) => q.eq("key", `monitor:${urlId}`))
        .unique(),
    );
    await backend.action(internal.serviceSync.run, {
      jobId: job!._id,
      version,
    });
    const saved = await backend.run((ctx) => ctx.db.get(job!._id));
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://monitor.test/monitors/register",
    );
    expect(saved?.status).toBe("complete");
    expect(saved?.lastError).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "[Link Monitoring] | Link cannot be monitored",
      expect.objectContaining({ convexUrlId: urlId }),
    );
    warn.mockRestore();
  });

  test.each([
    {
      status: 400,
      body: { success: false, code: "rate_limited" },
      register: true,
    },
    {
      status: 400,
      body: { success: true, code: "invalid_url" },
      register: true,
    },
    { status: 400, body: "invalid_url", register: true },
    {
      status: 422,
      body: { success: false, code: "invalid_url" },
      register: true,
    },
    {
      status: 500,
      body: { success: false, code: "invalid_url" },
      register: true,
    },
    {
      status: 400,
      body: { success: false, code: "invalid_url" },
      register: false,
    },
  ])(
    "any other rejection stays retryable: HTTP $status $body (register: $register)",
    async ({ status, body, register }) => {
      vi.stubEnv("ENVIRONMENT", "prod");
      vi.stubEnv("MONITOR_SERVICE_URL", "https://monitor.test");
      vi.stubEnv("MONITORING_API_SECRET", "test-only");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          typeof body === "string"
            ? new Response(body, { status })
            : Response.json(body, { status }),
        ),
      );
      await expect(
        deliverMonitoringChange({
          convexUrlId: "test",
          monitoringVersion: 1,
          registration: register
            ? {
                convexUserId: "user",
                longUrl: "https://example.test",
                shortUrl: "test",
              }
            : undefined,
        }),
      ).rejects.toThrow(`HTTP ${status}`);
    },
  );

  test("delivery requires an acknowledgement of the saved version and state", async () => {
    vi.stubEnv("ENVIRONMENT", "prod");
    vi.stubEnv("MONITOR_SERVICE_URL", "https://monitor.test");
    vi.stubEnv("MONITORING_API_SECRET", "test-only");
    const args = { convexUrlId: "test", monitoringVersion: 2 };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ success: true })),
    );
    await expect(deliverMonitoringChange(args)).rejects.toThrow(
      "did not confirm",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          success: true,
          monitoringVersion: 2,
          isDeleted: false,
        }),
      ),
    );
    await expect(deliverMonitoringChange(args)).rejects.toThrow(
      "did not confirm",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ success: true, monitoringVersion: 2, isDeleted: true }),
      ),
    );
    await expect(deliverMonitoringChange(args)).resolves.toBeUndefined();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          success: true,
          monitoringVersion: 3,
          isDeleted: false,
        }),
      ),
    );
    await expect(deliverMonitoringChange(args)).resolves.toBeUndefined();
  });

  test("legacy actions enqueue current desired state instead of sending stale payloads", async () => {
    const { backend, result, userId } = await setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await backend.action(internal.linkHealth.registerUrlWithMonitoringService, {
      convexUrlId: result.urlId,
      convexUserId: userId,
      longUrl: "https://stale.test",
      shortUrl: "stale",
    });
    const first = await backend.run((ctx) =>
      ctx.db.query("serviceSyncJobs").unique(),
    );
    expect(first?.target).toEqual({ kind: "monitor", urlId: result.urlId });
    await backend.action(
      internal.linkHealth.unregisterUrlFromMonitoringService,
      { convexUrlId: result.urlId },
    );
    const second = await backend.run((ctx) =>
      ctx.db.query("serviceSyncJobs").unique(),
    );
    expect(second!.version).toBeGreaterThan(first!.version);
    expect(fetch).not.toHaveBeenCalled();
  });

  test("presentation separates pending, blocked, stale and healthy results", () => {
    const now = Date.now();
    expect(getMonitoringStatus(null, null, now)).toBe("pending");
    expect(getMonitoringStatus("unknown", now, now)).toBe("unknown");
    expect(getMonitoringStatus("up", now - 46 * 60_000, now)).toBe("overdue");
    expect(getMonitoringStatus("up", now, now)).toBe("healthy");
  });
});

describe("incident messages", () => {
  test("timeouts and fixed monitoring failures read as plain language", () => {
    expect(describeIncident("down", 408, "Connection timed out")).toContain("timed out");
    expect(describeIncident("down", 408)).toContain("timed out");
    expect(describeIncident("down", 0, "Domain does not resolve")).toContain("domain name could not be found");
    expect(describeIncident("down", 0, "Secure connection failed")).toContain("certificate");
    expect(describeIncident("down", 0, "Too many redirects")).toContain("redirects too many times");
    expect(describeIncident("down", 0, "Unexpected error")).toContain("Unable to reach");
    expect(describeIncident("down", 0, "The operation was aborted")).toContain("timed out");
  });

  test("HTTP errors and slow responses keep their messages", () => {
    expect(describeIncident("down", 404)).toContain("could not be found");
    expect(describeIncident("down", 502)).toContain("experiencing issues");
    expect(describeIncident("down", 410)).toBe("The destination returned an error (HTTP 410).");
    expect(describeIncident("degraded", 200)).toContain("slower than expected");
  });
});

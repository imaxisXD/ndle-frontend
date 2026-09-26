import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { runLegacyOwnerBackfill } from "./backfill";
import { constantTimeEqual, matchesSecret } from "./secrets";
import { createTestBackend } from "./test.setup";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("constant-time secret comparison", () => {
  test("matches only the exact value", () => {
    expect(constantTimeEqual("secret-value", "secret-value")).toBe(true);
    for (const provided of [
      "secret-valuE",
      "secret-valu",
      "secret-value-",
      "secret-value".repeat(2),
      "",
    ]) {
      expect(constantTimeEqual(provided, "secret-value")).toBe(false);
    }
  });

  test("an unset or empty secret never matches", () => {
    expect(matchesSecret("", undefined)).toBe(false);
    expect(matchesSecret("undefined", undefined)).toBe(false);
    expect(matchesSecret("", "")).toBe(false);
    expect(matchesSecret("configured", "configured")).toBe(true);
  });
});

describe("service credentials", () => {
  test("click delivery refuses a near-miss or unset shared secret", async () => {
    const backend = createTestBackend();
    const event = {
      urlId: "not-checked-before-the-secret",
      urlStatusMessage: "success",
      urlStatusCode: 302,
      requestId: "click-one",
    };
    vi.stubEnv("SHARED_SECRET", "click-secret-for-tests");
    for (const sharedSecret of [
      "click-secret-for-test",
      "click-secret-for-testsx",
      "",
    ]) {
      await expect(
        backend.mutation(api.urlAnalytics.mutateUrlAnalytics, {
          ...event,
          sharedSecret,
        }),
      ).rejects.toThrow("Invalid shared secret");
    }
    vi.stubEnv("SHARED_SECRET", undefined);
    await expect(
      backend.mutation(api.urlAnalytics.mutateUrlAnalytics, {
        ...event,
        sharedSecret: "",
      }),
    ).rejects.toThrow("Invalid shared secret");
  });

  test("monitor results refuse a near-miss or unset shared secret", async () => {
    const backend = createTestBackend();
    const urlId = await backend.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Test",
        email: "test@example.test",
        membership: "pro",
        tokenIdentifier: "monitor-user",
      });
      return ctx.db.insert("urls", {
        fullurl: "https://example.test/page",
        shortUrl: "test",
        trackingEnabled: true,
        userTableId: userId,
      });
    });
    const result = {
      urlId,
      shortUrl: "test",
      longUrl: "https://example.test/page",
      checkedAt: Date.now(),
      statusCode: 200,
      latencyMs: 10,
      healthStatus: "up" as const,
      isHealthy: true,
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      vi.stubEnv("MONITORING_SHARED_SECRET", "monitor-secret-for-tests");
      for (const sharedSecret of ["monitor-secret-for-test", "", "x"]) {
        await expect(
          backend.mutation(api.linkHealth.recordHealthCheck, {
            ...result,
            sharedSecret,
          }),
        ).rejects.toThrow("Invalid shared secret");
      }
      vi.stubEnv("MONITORING_SHARED_SECRET", undefined);
      await expect(
        backend.mutation(api.linkHealth.recordHealthCheck, {
          ...result,
          sharedSecret: "",
        }),
      ).rejects.toThrow("Invalid shared secret");
    } finally {
      log.mockRestore();
    }
  });

  test("the legacy owner backfill is internal and runs without a shared secret", async () => {
    expect(runLegacyOwnerBackfill.isInternal).toBe(true);
    const backend = createTestBackend();
    const urlId = await backend.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        name: "Test",
        email: "test@example.test",
        membership: "free",
        tokenIdentifier: "legacy-owner",
      });
      return ctx.db.insert("urls", {
        fullurl: "https://example.test/legacy",
        shortUrl: "legacy",
        trackingEnabled: true,
        userTableId: userId,
      });
    });
    const result = await backend.action(
      internal.backfill.runLegacyOwnerBackfill,
      {},
    );
    expect(result.done).toBe(true);
    expect(await backend.run((ctx) => ctx.db.get(urlId))).toMatchObject({
      ownershipState: "user",
      analyticsOwnerKey: expect.any(String),
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSignedInAnalyticsViewer,
  getSignedInUserPlan,
} from "./server-analytics-plan";
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://convex.example");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
const result = (value: unknown) =>
  new Response(JSON.stringify({ status: "success", value }), {
    headers: { "Content-Type": "application/json" },
  });
describe("authenticated analytics account", () => {
  it("gets account and plan from the authenticated Convex result", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(result({ userId: "account", membership: "pro" }));
    vi.stubGlobal("fetch", request);
    const token = vi.fn().mockResolvedValue("signed-token");
    expect(await getSignedInAnalyticsViewer(token)).toEqual({
      userId: "account",
      plan: "pro",
    });
    expect(token).toHaveBeenCalledWith({ template: "convex" });
    expect(request).toHaveBeenCalledWith(
      "https://convex.example/api/query",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
        headers: expect.objectContaining({
          Authorization: "Bearer signed-token",
        }),
      }),
    );
    expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
      path: "users:getViewerState",
      args: {},
      format: "json",
    });
  });
  it.each([
    { membership: "pro" },
    { userId: "account", membership: "administrator" },
  ])("rejects an incomplete or unknown account response", async (value) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(result(value)));
    expect(await getSignedInAnalyticsViewer(async () => "token")).toBeNull();
  });
  it("returns no account when token lookup throws or times out", async () => {
    expect(
      await getSignedInAnalyticsViewer(async () => {
        throw new Error("unavailable");
      }),
    ).toBeNull();
    vi.useFakeTimers();
    const lookup = getSignedInAnalyticsViewer(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(5000);
    expect(await lookup).toBeNull();
  });
  it("keeps plan-only callers compatible", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(result({ userId: "account", membership: "free" })),
    );
    expect(await getSignedInUserPlan(async () => "token")).toBe("free");
  });
});

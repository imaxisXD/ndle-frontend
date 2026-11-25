// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { getAnalyticsDateWindow } from "@/lib/analytics-date-window";
import { ANALYTICS_PLAN_REQUIRED } from "@/lib/analytics-access";
import { GET } from "./route";

const viewerMock = vi.hoisted(() => ({
  plan: "free" as "guest" | "free" | "pro",
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({
    userId: "test-account",
    getToken: async () => "test-token",
  }),
}));
vi.mock("@/lib/rateLimit", () => ({
  getAnalyticsRateLimit: () => ({ limit: async () => ({ success: true }) }),
}));
vi.mock("@/lib/server-analytics-plan", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/server-analytics-plan")>()),
  getSignedInAnalyticsViewer: async () => ({
    userId: "verified-account",
    plan: viewerMock.plan,
  }),
}));

afterEach(() => {
  viewerMock.plan = "free";
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("the 24-hour dashboard window reaches ingest after local midnight but before UTC midnight", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-05T20:00:00Z"));
  vi.stubEnv("TZ", "Asia/Kolkata");
  vi.stubEnv("INTERNAL_API_URL", "https://ingest.example/analytics/v2");
  vi.stubEnv("API_SECRET", "test-secret");
  const request = vi.fn<(url: URL, options?: RequestInit) => Promise<Response>>(async () =>
    Response.json({ totalClicks: 1 }),
  );
  vi.stubGlobal("fetch", request);

  // The previously sent browser-local date is a future UTC date and must stay invalid.
  expect(
    (
      await GET(
        new NextRequest("https://app.example/api/analytics/v2?start=2026-09-06&end=2026-09-06"),
      )
    ).status,
  ).toBe(400);
  expect(request).not.toHaveBeenCalled();

  const window = getAnalyticsDateWindow("24h");
  const response = await GET(
    new NextRequest(`https://app.example/api/analytics/v2?${new URLSearchParams(window)}`),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ totalClicks: 1 });
  expect(String(request.mock.calls[0][0])).toBe(
    "https://ingest.example/analytics/v2?start=2026-09-05&end=2026-09-05",
  );
  expect(request.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: "Bearer test-secret" },
  });
});

test("ingest reads use the scoped analytics secret when it is set", async () => {
  vi.stubEnv("INTERNAL_API_URL", "https://ingest.example/analytics/v2");
  vi.stubEnv("API_SECRET", "test-secret");
  vi.stubEnv("ANALYTICS_READ_SECRET", "analytics-read-only");
  const request = vi.fn<(url: URL, options?: RequestInit) => Promise<Response>>(async () =>
    Response.json({ totalClicks: 1 }),
  );
  vi.stubGlobal("fetch", request);
  const window = getAnalyticsDateWindow("7d");
  const response = await GET(
    new NextRequest(`https://app.example/api/analytics/v2?${new URLSearchParams(window)}`),
  );
  expect(response.status).toBe(200);
  expect(request.mock.calls[0][1]).toMatchObject({
    headers: { Authorization: "Bearer analytics-read-only" },
  });
});

test("free plans allow the 30d preset but block historical windows and includeFiles", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
  vi.stubEnv("INTERNAL_API_URL", "https://ingest.example/analytics/v2");
  vi.stubEnv("API_SECRET", "test-secret");
  const request = vi.fn<(url: URL, options?: RequestInit) => Promise<Response>>(async () =>
    Response.json({ totalClicks: 5 }),
  );
  vi.stubGlobal("fetch", request);

  // 30d preset passes on free plan
  const window30d = getAnalyticsDateWindow("30d");
  const okRes = await GET(
    new NextRequest(`https://app.example/api/analytics/v2?${new URLSearchParams(window30d)}`),
  );
  expect(okRes.status).toBe(200);

  // Short historical window (<=30 days wide, but older than 30 days ago) is blocked
  const historicalRes = await GET(
    new NextRequest("https://app.example/api/analytics/v2?start=2023-01-01&end=2023-01-07"),
  );
  expect(historicalRes.status).toBe(403);
  expect(await historicalRes.json()).toMatchObject({
    code: ANALYTICS_PLAN_REQUIRED,
  });

  // includeFiles=true is blocked on free plan
  const filesRes = await GET(
    new NextRequest(
      `https://app.example/api/analytics/v2?${new URLSearchParams({
        ...window30d,
        includeFiles: "true",
      })}`,
    ),
  );
  expect(filesRes.status).toBe(403);
  expect(await filesRes.json()).toMatchObject({
    code: ANALYTICS_PLAN_REQUIRED,
  });

  // Pro plan allows both historical windows and includeFiles=true
  viewerMock.plan = "pro";
  const proRes = await GET(
    new NextRequest(
      "https://app.example/api/analytics/v2?start=2023-01-01&end=2023-01-07&includeFiles=true",
    ),
  );
  expect(proRes.status).toBe(200);
});

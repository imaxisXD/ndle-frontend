// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { getAnalyticsDateWindow } from "@/lib/analytics-date-window";
import { GET } from "./route";

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({
    userId: "test-account",
    getToken: async () => "test-token",
  }),
}));
vi.mock("@/lib/rateLimit", () => ({
  getRateLimit: () => ({ limit: async () => ({ success: true }) }),
}));
vi.mock("@/lib/server-analytics-plan", () => ({
  getSignedInAnalyticsViewer: async () => ({
    userId: "verified-account",
    plan: "free",
  }),
}));

afterEach(() => {
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
  const request = vi.fn(async (_url: URL) => Response.json({ totalClicks: 1 }));
  vi.stubGlobal("fetch", request);

  // The previously sent browser-local date is a future UTC date and must stay invalid.
  expect(
    (
      await GET(
        new NextRequest(
          "https://app.example/api/analytics/v2?start=2026-09-06&end=2026-09-06",
        ),
      )
    ).status,
  ).toBe(400);
  expect(request).not.toHaveBeenCalled();

  const window = getAnalyticsDateWindow("24h");
  const response = await GET(
    new NextRequest(
      `https://app.example/api/analytics/v2?${new URLSearchParams(window)}`,
    ),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ totalClicks: 1 });
  expect(String(request.mock.calls[0][0])).toBe(
    "https://ingest.example/analytics/v2?start=2026-09-05&end=2026-09-05",
  );
});

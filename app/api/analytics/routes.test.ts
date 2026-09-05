import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rateLimit", () => ({
  getRateLimit: () => ({ limit: mocks.limit }),
}));
let request: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://convex.example");
  vi.stubEnv("INTERNAL_API_URL", "https://ingest.example/analytics/v2");
  vi.stubEnv("API_SECRET", "server-secret");
  mocks.auth.mockResolvedValue({
    userId: "clerk-account",
    sessionClaims: { convex_user_id: "stale-or-spoofed" },
    getToken: async () => "signed-token",
  });
  mocks.limit.mockResolvedValue({ success: true, limit: 100, remaining: 99 });
  request = vi.fn(async (url: string, _options?: RequestInit) =>
    url.includes("convex.example")
      ? new Response(
          JSON.stringify({
            status: "success",
            value: { userId: "verified-account", membership: "free" },
          }),
        )
      : new Response(JSON.stringify({ data: [
          url.includes("endpoint=breakdown")
            ? { country: "IN", clicks: 3 }
            : url.includes("endpoint=traffic-sources")
              ? { source: "ndle.app", clicks: 3 }
              : { time: "2026-01-03", clicks: 3 },
        ] })),
  );
  vi.stubGlobal("fetch", request);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
const routes = {
  timeseries: () => import("./timeseries/route"),
  breakdown: () => import("./breakdown/route"),
  "top-links": () => import("./top-links/route"),
  "traffic-sources": () => import("./traffic-sources/route"),
  live: () => import("./live/route"),
  "recent-activity": () => import("./recent-activity/route"),
  dashboard: () => import("./dashboard/route"),
  overview: () => import("./overview/route"),
  variants: () => import("./variants/route"),
};
it.each(Object.keys(routes))(
  "%s forwards only the verified account and bounds the backend read",
  async (name) => {
    const route = await routes[name as keyof typeof routes]();
    const response = await route.GET(
      new NextRequest(
        `https://app.example/api/analytics/${name}?range=7d&dimension=country&link_slug=example&link_id=example`,
        { headers: { "x-user-id": "attacker" } },
      ),
    );
    expect(response.status).toBe(200);
    const backend = request.mock.calls.find((call) =>
      String(call[0]).includes("ingest.example"),
    );
    expect(backend).toBeDefined();
    expect(backend![1]).toMatchObject({
      cache: "no-store",
      signal: expect.any(AbortSignal),
      headers: {
        "x-user-id": "verified-account",
        Authorization: "Bearer server-secret",
      },
    });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  },
);
it("does not read analytics when the user is signed out", async () => {
  mocks.auth.mockResolvedValue({ userId: null, getToken: async () => null });
  const { GET } = await import("./timeseries/route");
  expect(
    (await GET(new NextRequest("https://app.example/api/analytics/timeseries")))
      .status,
  ).toBe(401);
  expect(request).not.toHaveBeenCalled();
});
it("blocks a paid range using the authoritative plan", async () => {
  const { GET } = await import("./timeseries/route");
  expect(
    (
      await GET(
        new NextRequest(
          "https://app.example/api/analytics/timeseries?range=12mo",
        ),
      )
    ).status,
  ).toBe(403);
  expect(
    request.mock.calls.some((call) =>
      String(call[0]).includes("ingest.example"),
    ),
  ).toBe(false);
});
it("reports account setup as retryable without asking the user to sign in again", async () => {
  request.mockImplementation(
    async () =>
      new Response(
        JSON.stringify({ status: "success", value: { membership: "guest" } }),
      ),
  );
  const { GET } = await import("./live/route");
  expect(
    (await GET(new NextRequest("https://app.example/api/analytics/live")))
      .status,
  ).toBe(503);
});

it.each([
  { route: "breakdown" as const, dimension: "country", row: { country: "IN", clicks: 1 }, aliases: { label: "IN" } },
  { route: "breakdown" as const, dimension: "browser", row: { browser: "Chrome", clicks: 1 }, aliases: { label: "Chrome" } },
  { route: "breakdown" as const, dimension: "device", row: { device: "desktop", clicks: 1 }, aliases: { label: "desktop" } },
  { route: "breakdown" as const, dimension: "os", row: { os: "macOS", clicks: 1 }, aliases: { label: "macOS" } },
  { route: "traffic-sources" as const, dimension: "", row: { source: "ndle.app", clicks: 1 }, aliases: { referer_domain: "ndle.app" } },
  { route: "timeseries" as const, dimension: "", row: { time: "2026-08-08", clicks: 1 }, aliases: { bucket_start: "2026-08-08" } },
])("$route $dimension preserves service data and supplies chart fields", async ({ route, dimension, row, aliases }) => {
  request.mockImplementation(async (url: string) => Response.json(
    url.includes("convex.example")
      ? { status: "success", value: { userId: "verified-account", membership: "free" } }
      : { data: [row], meta: { coverage: { complete: true } } },
  ));
  const { GET } = await routes[route]();
  const response = await GET(new NextRequest(`https://app.example/api/analytics/${route}?range=30d&dimension=${dimension}&link_slug=elevenricelaugh`));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data).toEqual([{ ...row, ...aliases }]);
  expect(body.meta.coverage.complete).toBe(true);
  if (route === "timeseries") {
    expect(body.granularity).toBe("day");
    expect(new Date(body.data[0].bucket_start).toISOString()).toBe("2026-08-08T00:00:00.000Z");
    expect(body.data[0]).not.toHaveProperty("human_clicks");
    expect(body.data[0]).not.toHaveProperty("bot_clicks");
  }
});

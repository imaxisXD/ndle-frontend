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
      : new Response(
          JSON.stringify({ data: [{ time: "2026-01-03", clicks: 3 }] }),
        ),
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

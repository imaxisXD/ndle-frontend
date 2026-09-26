import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ANALYTICS_RATE_LIMIT } from "@/lib/rateLimit";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  limit: vi.fn(),
  defaultLimit: vi.fn(),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rateLimit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rateLimit")>()),
  getRateLimit: () => ({ limit: mocks.defaultLimit }),
  getAnalyticsRateLimit: () => ({ limit: mocks.limit }),
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
  request = vi.fn(async (input: string | URL, _options?: RequestInit) => {
    const url = String(input);
    const dimension = new URL(url).searchParams.get("dimension") ?? "country";
    return url.includes("convex.example")
      ? new Response(
          JSON.stringify({
            status: "success",
            value: { userId: "verified-account", membership: "free" },
          }),
        )
      : new Response(JSON.stringify({ data: [
          url.includes("endpoint=breakdown")
            ? { [dimension]: "IN", clicks: 3 }
            : url.includes("endpoint=traffic-sources")
              ? { source: "ndle.app", clicks: 3 }
              : { time: "2026-01-03", clicks: 3 },
        ] }));
  });
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
it.each(Object.keys(routes))(
  "%s authenticates ingest reads with the scoped analytics secret when set",
  async (name) => {
    vi.stubEnv("ANALYTICS_READ_SECRET", "analytics-read-only");
    const route = await routes[name as keyof typeof routes]();
    const response = await route.GET(
      new NextRequest(
        `https://app.example/api/analytics/${name}?range=7d&dimension=country&link_slug=example&link_id=example`,
      ),
    );
    expect(response.status).toBe(200);
    const backend = request.mock.calls.find((call) =>
      String(call[0]).includes("ingest.example"),
    );
    expect(backend![1]).toMatchObject({
      headers: { Authorization: "Bearer analytics-read-only" },
    });
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

const botFilterRoutes = [
  "timeseries",
  "breakdown",
  "top-links",
  "traffic-sources",
  "live",
  "recent-activity",
  "variants",
] as const;
it.each(botFilterRoutes)(
  "%s includes bots by default and forwards the exclude-bots filter",
  async (name) => {
    const route = await routes[name]();
    const backendUrl = async (query: string) => {
      request.mockClear();
      const response = await route.GET(
        new NextRequest(
          `https://app.example/api/analytics/${name}?range=7d&dimension=country&link_slug=example&link_id=example${query}`,
        ),
      );
      expect(response.status).toBe(200);
      return new URL(
        String(
          request.mock.calls.find((call) =>
            String(call[0]).includes("ingest.example"),
          )![0],
        ),
      );
    };
    expect((await backendUrl("")).searchParams.has("excludeBots")).toBe(false);
    expect(
      (await backendUrl("&exclude_bots=false")).searchParams.has("excludeBots"),
    ).toBe(false);
    expect(
      (await backendUrl("&exclude_bots=true")).searchParams.get("excludeBots"),
    ).toBe("true");
  },
);

const today = new Date().toISOString().slice(0, 10);
const limitedRoutes = { ...routes, v2: () => import("./v2/route") };
type LimitedRoute = keyof typeof limitedRoutes;
const getRoute = async (path: string) => {
  const url = new URL(path, "https://app.example/api/analytics/");
  const name = url.pathname.split("/").pop() as LimitedRoute;
  return (await limitedRoutes[name]()).GET(new NextRequest(url));
};

/** A sliding window shared by every request with the same key, as in Redis. */
function useLimiterBuckets() {
  const used = new Map<string, number>();
  mocks.limit.mockImplementation(async (key: string) => {
    const count = (used.get(key) ?? 0) + 1;
    used.set(key, count);
    return {
      success: count <= ANALYTICS_RATE_LIMIT.requests,
      limit: ANALYTICS_RATE_LIMIT.requests,
      remaining: Math.max(0, ANALYTICS_RATE_LIMIT.requests - count),
    };
  });
}

it.each(Object.keys(limitedRoutes))(
  "%s rate-limits by route and account, never by the requested link",
  async (name) => {
    const slug = "attacker-chosen-slug";
    const response = await getRoute(
      `${name}?range=7d&dimension=country&link_slug=${slug}&link_id=${slug}&link=${slug}&start=${today}&end=${today}`,
    );
    expect(response.status).toBe(200);
    expect(mocks.limit).toHaveBeenCalledTimes(1);
    expect(mocks.limit).toHaveBeenCalledWith(`analytics:${name}:clerk-account`);
    expect(String(mocks.limit.mock.calls[0][0])).not.toContain(slug);
    expect(mocks.defaultLimit).not.toHaveBeenCalled();
  },
);

it("new link slugs share the account's bucket instead of opening new ones", async () => {
  useLimiterBuckets();
  const statuses: number[] = [];
  for (let index = 0; index <= ANALYTICS_RATE_LIMIT.requests; index += 1) {
    statuses.push(
      (await getRoute(`timeseries?range=7d&link_slug=random-${index}`)).status,
    );
  }
  expect(statuses.slice(0, -1).every((status) => status === 200)).toBe(true);
  expect(statuses.at(-1)).toBe(429);
});

it("opening a link page and switching ranges several times is not rate-limited", async () => {
  useLimiterBuckets();
  // Everything the link page requests at once on load.
  const linkPageLoad = [
    "timeseries?range=7d&link_slug=example",
    ...["browser", "device", "os", "country"].map(
      (dimension) => `breakdown?range=7d&dimension=${dimension}&link_slug=example`,
    ),
    "traffic-sources?range=7d&link_slug=example",
    "variants?range=7d&link_id=example",
    `v2?start=${today}&end=${today}&link=example`,
  ];
  // Ten loads inside one window, plus the live counter polling alongside.
  const burst = [
    ...Array.from({ length: 10 }, () => linkPageLoad).flat(),
    "live?link_slug=example",
    "live?link_slug=example",
  ];
  const responses = await Promise.all(burst.map(getRoute));
  expect(responses.map((response) => response.status)).toEqual(
    burst.map(() => 200),
  );
});

it.each([
  "timeseries",
  "breakdown",
  "traffic-sources",
  "live",
  "recent-activity",
  "dashboard",
  "overview",
  "variants",
] as const)("%s refuses an oversized link slug before any lookup", async (name) => {
  const tooLong = "a".repeat(129);
  const response = await getRoute(
    `${name}?range=7d&dimension=country&link_slug=${tooLong}&link_id=${tooLong}`,
  );
  expect(response.status).toBe(400);
  expect(mocks.limit).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
});

it("marks a range the plan does not include so the page can explain it", async () => {
  const response = await getRoute("timeseries?range=12mo&link_slug=example");
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "plan_required" });
});

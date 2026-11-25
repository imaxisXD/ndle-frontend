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
  request = vi.fn(async (input: string | URL) => {
    const url = String(input);
    return url.includes("convex.example")
      ? new Response(
          JSON.stringify({
            status: "success",
            value: { userId: "verified-account", membership: "free" },
          }),
        )
      : new Response(JSON.stringify({ data: [{ time: "2026-01-03", clicks: 3 }] }));
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
  variants: () => import("./variants/route"),
};

it.each(Object.keys(routes))(
  "%s forwards only the verified account and bounds the backend read",
  async (name) => {
    const route = await routes[name as keyof typeof routes]();
    const response = await route.GET(
      new NextRequest(
        `https://app.example/api/analytics/${name}?range=7d&link_slug=example&link_id=example`,
        { headers: { "x-user-id": "attacker" } },
      ),
    );
    expect(response.status).toBe(200);
    const backend = request.mock.calls.find((call) => String(call[0]).includes("ingest.example"));
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
        `https://app.example/api/analytics/${name}?range=7d&link_slug=example&link_id=example`,
      ),
    );
    expect(response.status).toBe(200);
    const backend = request.mock.calls.find((call) => String(call[0]).includes("ingest.example"));
    expect(backend![1]).toMatchObject({
      headers: { Authorization: "Bearer analytics-read-only" },
    });
  },
);

it("does not read analytics when the user is signed out", async () => {
  mocks.auth.mockResolvedValue({ userId: null, getToken: async () => null });
  const { GET } = await import("./timeseries/route");
  expect((await GET(new NextRequest("https://app.example/api/analytics/timeseries"))).status).toBe(
    401,
  );
  expect(request).not.toHaveBeenCalled();
});

it("blocks a paid range using the authoritative plan", async () => {
  const { GET } = await import("./timeseries/route");
  expect(
    (await GET(new NextRequest("https://app.example/api/analytics/timeseries?range=12mo"))).status,
  ).toBe(403);
  expect(request.mock.calls.some((call) => String(call[0]).includes("ingest.example"))).toBe(false);
});

it("reports account setup as retryable without asking the user to sign in again", async () => {
  request.mockImplementation(
    async () => new Response(JSON.stringify({ status: "success", value: { membership: "guest" } })),
  );
  const { GET } = await import("./timeseries/route");
  expect(
    (await GET(new NextRequest("https://app.example/api/analytics/timeseries?range=7d"))).status,
  ).toBe(503);
});

it("timeseries preserves service data and supplies chart fields", async () => {
  request.mockImplementation(async (url: string) =>
    Response.json(
      url.includes("convex.example")
        ? {
            status: "success",
            value: { userId: "verified-account", membership: "free" },
          }
        : {
            data: [{ time: "2026-08-08", clicks: 1 }],
            meta: { coverage: { complete: true } },
          },
    ),
  );
  const { GET } = await routes.timeseries();
  const response = await GET(
    new NextRequest(
      "https://app.example/api/analytics/timeseries?range=30d&link_slug=elevenricelaugh",
    ),
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data).toEqual([{ time: "2026-08-08", clicks: 1, bucket_start: "2026-08-08" }]);
  expect(body.meta.coverage.complete).toBe(true);
  expect(body.granularity).toBe("day");
  expect(new Date(body.data[0].bucket_start).toISOString()).toBe("2026-08-08T00:00:00.000Z");
  expect(body.data[0]).not.toHaveProperty("human_clicks");
  expect(body.data[0]).not.toHaveProperty("bot_clicks");
});

const botFilterRoutes = ["timeseries", "variants"] as const;
it.each(botFilterRoutes)(
  "%s includes bots by default and forwards the exclude-bots filter",
  async (name) => {
    const route = await routes[name]();
    const backendUrl = async (query: string) => {
      request.mockClear();
      const response = await route.GET(
        new NextRequest(
          `https://app.example/api/analytics/${name}?range=7d&link_slug=example&link_id=example${query}`,
        ),
      );
      expect(response.status).toBe(200);
      return new URL(
        String(request.mock.calls.find((call) => String(call[0]).includes("ingest.example"))![0]),
      );
    };
    expect((await backendUrl("")).searchParams.has("excludeBots")).toBe(false);
    expect((await backendUrl("&exclude_bots=false")).searchParams.has("excludeBots")).toBe(false);
    expect((await backendUrl("&exclude_bots=true")).searchParams.get("excludeBots")).toBe("true");
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
      `${name}?range=7d&link_slug=${slug}&link_id=${slug}&link=${slug}&start=${today}&end=${today}`,
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
    statuses.push((await getRoute(`timeseries?range=7d&link_slug=random-${index}`)).status);
  }
  expect(statuses.slice(0, -1).every((status) => status === 200)).toBe(true);
  expect(statuses.at(-1)).toBe(429);
});

it("opening a link page and switching ranges several times is not rate-limited", async () => {
  useLimiterBuckets();
  const linkPageLoad = [
    "timeseries?range=7d&link_slug=example",
    "variants?range=7d&link_id=example",
    `v2?start=${today}&end=${today}&link=example`,
  ];
  const burst = Array.from({ length: 10 }, () => linkPageLoad).flat();
  const responses = await Promise.all(burst.map(getRoute));
  expect(responses.map((response) => response.status)).toEqual(burst.map(() => 200));
});

it.each(["timeseries", "variants"] as const)(
  "%s refuses an oversized link slug before any lookup",
  async (name) => {
    const tooLong = "a".repeat(129);
    const response = await getRoute(`${name}?range=7d&link_slug=${tooLong}&link_id=${tooLong}`);
    expect(response.status).toBe(400);
    expect(request).not.toHaveBeenCalled();
  },
);

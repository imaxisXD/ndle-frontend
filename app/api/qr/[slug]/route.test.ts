// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  limit: vi.fn(),
  viewer: vi.fn(),
  queryConvex: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/rateLimit", () => ({
  getQrRateLimit: () => ({ limit: mocks.limit }),
}));
vi.mock("@/lib/server-analytics-plan", () => ({
  getSignedInAnalyticsViewer: mocks.viewer,
  queryConvexAsUser: mocks.queryConvex,
}));

beforeEach(() => {
  mocks.auth.mockResolvedValue({
    userId: "user_1",
    getToken: async () => "token",
  });
  mocks.limit.mockResolvedValue({ success: true });
  mocks.viewer.mockResolvedValue({ userId: "convex_1", plan: "free" });
  mocks.queryConvex.mockResolvedValue([{ domain: "links.example.com" }]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("/api/qr/[slug]", () => {
  test("returns private cache headers on 200 SVG and no-store on errors", async () => {
    const ok = await GET(
      new NextRequest("https://ndle.app/api/qr/abc123?format=svg"),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Cache-Control")).toBe("private, max-age=3600");
    expect(await ok.text()).toContain("<svg");

    const badFormat = await GET(
      new NextRequest("https://ndle.app/api/qr/abc123?format=gif"),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(badFormat.status).toBe(406);
    expect(badFormat.headers.get("Cache-Control")).toBe("no-store");
  });

  test("blocks custom or logo-free QR modes for non-Pro users", async () => {
    const customRes = await GET(
      new NextRequest("https://ndle.app/api/qr/abc123?format=svg&logoMode=custom"),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(customRes.status).toBe(403);
    expect(customRes.headers.get("Cache-Control")).toBe("no-store");

    const noneRes = await GET(
      new NextRequest("https://ndle.app/api/qr/abc123?format=svg&logoMode=none"),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(noneRes.status).toBe(403);

    mocks.viewer.mockResolvedValue({ userId: "convex_1", plan: "pro" });
    const proRes = await GET(
      new NextRequest("https://ndle.app/api/qr/abc123?format=svg&logoMode=none"),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(proRes.status).toBe(200);
  });

  test("allows owned custom domain and rejects unowned domains", async () => {
    const owned = await GET(
      new NextRequest(
        "https://ndle.app/api/qr/abc123?format=svg&domain=links.example.com",
      ),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(owned.status).toBe(200);

    const spoofed = await GET(
      new NextRequest("https://ndle.app/api/qr/abc123?format=svg&domain=evil.com"),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(spoofed.status).toBe(403);
    expect(spoofed.headers.get("Cache-Control")).toBe("no-store");
  });

  test("enforces auth and rate limiting", async () => {
    mocks.auth.mockResolvedValue({ userId: null, getToken: async () => null });
    const unauth = await GET(
      new NextRequest("https://ndle.app/api/qr/abc123?format=svg"),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(unauth.status).toBe(401);

    mocks.auth.mockResolvedValue({
      userId: "user_1",
      getToken: async () => "token",
    });
    mocks.limit.mockResolvedValue({ success: false });
    const limited = await GET(
      new NextRequest("https://ndle.app/api/qr/abc123?format=svg"),
      { params: Promise.resolve({ slug: "abc123" }) },
    );
    expect(limited.status).toBe(429);
  });
});

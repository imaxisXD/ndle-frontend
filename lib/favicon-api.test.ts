// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { handleFaviconApiRequest } from "./favicon-api";
import { DEFAULT_FILE_PROXY_URL } from "./config";

const limitMock = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock("@/lib/rateLimit", () => ({
  getFaviconRateLimit: () => ({ limit: limitMock }),
}));

afterEach(() => {
  limitMock.mockResolvedValue({ success: true });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("favicon API", () => {
  test("does not crash when NEXT_PUBLIC_FILE_PROXY_URL is a relative path (/apiv2)", async () => {
    vi.stubEnv("NEXT_PUBLIC_FILE_PROXY_URL", "/apiv2");
    vi.stubEnv("FILE_PROXY_ORIGIN", "");
    const fetchMock = vi.fn<
      (input: string | URL | Request, init?: RequestInit) => Promise<Response>
    >(
      async () =>
        new Response(JSON.stringify({ faviconUrl: "https://example.com/favicon.ico" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleFaviconApiRequest(
      new NextRequest("https://ndle.app/api/favicon?url=https://example.com"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      faviconUrl: "https://example.com/favicon.ico",
    });
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${DEFAULT_FILE_PROXY_URL}/favicon?url=https%3A%2F%2Fexample.com`,
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      signal: expect.any(AbortSignal),
    });
  });

  test("returns 429 when rate limited", async () => {
    limitMock.mockResolvedValue({ success: false });
    const response = await handleFaviconApiRequest(
      new NextRequest("https://ndle.app/api/favicon?url=https://example.com"),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

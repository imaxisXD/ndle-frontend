import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const state = vi.hoisted(() => ({ turnstile: true, allow: true, checked: [] as string[], limitKeys: [] as string[] }));
vi.mock("@/lib/turnstile", () => ({
  turnstileSecretKey: () => "secret",
  verifyTurnstile: async () => state.turnstile,
}));
vi.mock("@/lib/rateLimit", () => ({
  getLinkCheckRateLimit: () => ({
    limit: async (key: string) => {
      state.limitKeys.push(key);
      return { success: state.allow };
    },
  }),
}));
vi.mock("@/lib/link-check", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/link-check")>();
  return {
    ...actual,
    checkLink: async (url: URL) => {
      state.checked.push(url.href);
      return { verdict: "working", finalUrl: url.href, status: 200, hops: [], totalMs: 1 };
    },
  };
});

afterEach(() => {
  state.turnstile = true;
  state.allow = true;
  state.checked = [];
  state.limitKeys = [];
});

function request(body: unknown, origin = "https://ndle.test") {
  return new NextRequest("https://ndle.test/api/tools/link-check", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin, "cf-connecting-ip": "203.0.113.7" },
    body: JSON.stringify(body),
  });
}

describe("link check route", () => {
  test("checks a public link for a verified visitor", async () => {
    const response = await POST(request({ url: "example.com", token: "t" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(state.checked).toEqual(["https://example.com/"]);
    expect(state.limitKeys).toEqual(["link-check:203.0.113.7"]);
  });

  test("refuses other websites", async () => {
    const response = await POST(request({ url: "example.com", token: "t" }, "https://evil.example"));
    expect(response.status).toBe(403);
    expect(state.checked).toEqual([]);
  });

  test("refuses private addresses before spending the security check", async () => {
    const response = await POST(request({ url: "http://127.0.0.1", token: "t" }));
    expect(response.status).toBe(400);
    expect(state.limitKeys).toEqual([]);
  });

  test("refuses a failed security check", async () => {
    state.turnstile = false;
    const response = await POST(request({ url: "example.com", token: "t" }));
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("turnstile_failed");
    expect(state.checked).toEqual([]);
  });

  test("stops at the rate limit", async () => {
    state.allow = false;
    const response = await POST(request({ url: "example.com", token: "t" }));
    expect(response.status).toBe(429);
    expect(state.checked).toEqual([]);
  });
});

import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import {
  createGuestSessionToken,
  deriveGuestNetworkKey,
  GUEST_CREDENTIAL_COOKIE,
  verifyGuestSessionCredential,
  verifyGuestSessionToken,
} from "@/convex/guestTokens";

const newSessionLimit = vi.hoisted(() => ({ keys: [] as string[], allow: true }));
vi.mock("@/lib/rateLimit", () => ({
  getRateLimit: () => ({ limit: async () => ({ success: true }) }),
  getGuestSessionNetworkRateLimit: () => ({
    limit: async (key: string) => {
      newSessionLimit.keys.push(key);
      return { success: newSessionLimit.allow };
    },
  }),
}));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  newSessionLimit.keys = [];
  newSessionLimit.allow = true;
});
function request(body: unknown, cookie?: string, origin = "https://ndle.test", ip?: string) {
  return new NextRequest("https://ndle.test/api/guest-session", { method: "POST", headers: { "Content-Type": "application/json", origin, ...(cookie ? { cookie: `${GUEST_CREDENTIAL_COOKIE}=${cookie}` } : {}), ...(ip ? { "cf-connecting-ip": ip } : {}) }, body: JSON.stringify(body) });
}
async function networkOf(guestToken: string, guestId: string) {
  return (await verifyGuestSessionCredential(guestId, guestToken)).networkKey;
}
describe("guest credentials", () => {
  test("never signs a supplied identifier without proof", async () => {
    const victim = crypto.randomUUID();
    const response = await POST(request({ guestId: victim }));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.guestId).not.toBe(victim);
    expect(await verifyGuestSessionToken(result.guestId, result.guestToken)).toBe(result.guestId);
    expect(response.cookies.get(GUEST_CREDENTIAL_COOKIE)?.httpOnly).toBe(true);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  test("renews only the owner proven by the signed credential", async () => {
    const ownId = crypto.randomUUID();
    const session = await createGuestSessionToken(ownId);
    const response = await POST(request({ guestId: crypto.randomUUID() }, session.guestToken));
    expect((await response.json()).guestId).toBe(ownId);
  });
  test("supports legacy signed tokens and explicit rotation after claiming", async () => {
    const ownId = crypto.randomUUID();
    const session = await createGuestSessionToken(ownId);
    expect((await (await POST(request({ guestToken: session.guestToken }))).json()).guestId).toBe(ownId);
    expect((await (await POST(request({ startNew: true }, session.guestToken))).json()).guestId).not.toBe(ownId);
  });
  test("rejects forged, extra-part and expired credentials", async () => {
    const session = await createGuestSessionToken(crypto.randomUUID());
    expect((await POST(request({}, `${session.guestToken}x`))).status).toBe(401);
    expect((await POST(request({}, `${session.guestToken}.extra`))).status).toBe(401);
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 9 * 86400_000);
    expect((await POST(request({}, session.guestToken))).status).toBe(401);
  });
  test("renews credentials signed before the dedicated secret only during the legacy window", async () => {
    vi.stubEnv("GUEST_SESSION_SECRET", undefined);
    vi.stubEnv("API_SECRET", "api-secret-shared-with-services");
    const ownId = crypto.randomUUID();
    const legacy = await createGuestSessionToken(ownId);
    vi.stubEnv("GUEST_SESSION_SECRET", "dedicated-guest-secret-for-tests");
    vi.stubEnv("GUEST_SESSION_LEGACY_ACCEPT_UNTIL", new Date(Date.now() + 86400_000).toISOString());
    const renewed = await (await POST(request({}, legacy.guestToken))).json();
    expect(renewed.guestId).toBe(ownId);
    vi.stubEnv("GUEST_SESSION_LEGACY_ACCEPT_UNTIL", undefined);
    // The renewed credential no longer depends on the shared fallback secret.
    expect(await verifyGuestSessionToken(ownId, renewed.guestToken)).toBe(ownId);
    expect((await POST(request({}, legacy.guestToken))).status).toBe(401);
  });
  test("rejects requests from another origin", async () => {
    expect((await POST(request({}, undefined, "https://elsewhere.test"))).status).toBe(403);
  });
});

describe("guest network limits", () => {
  test("signs a hashed network key, never the address, into every session", async () => {
    const first = await (await POST(request({}, undefined, undefined, "203.0.113.7"))).json();
    const second = await (await POST(request({ startNew: true }, undefined, undefined, "203.0.113.7"))).json();
    const elsewhere = await (await POST(request({}, undefined, undefined, "198.51.100.4"))).json();
    const expected = await deriveGuestNetworkKey("203.0.113.7");
    expect(expected).toMatch(/^[0-9a-f]{32}$/);
    expect(await networkOf(first.guestToken, first.guestId)).toBe(expected);
    // A fresh guest ID does not escape the network key.
    expect(second.guestId).not.toBe(first.guestId);
    expect(await networkOf(second.guestToken, second.guestId)).toBe(expected);
    expect(await networkOf(elsewhere.guestToken, elsewhere.guestId)).not.toBe(expected);
    expect(atob(first.guestToken.split(".")[0].replace(/-/g, "+").replace(/_/g, "/"))).not.toContain("203.0.113.7");
    expect(first).not.toHaveProperty("net");
  });
  test("caps new sessions per network but never renewals", async () => {
    const session = await (await POST(request({}, undefined, undefined, "203.0.113.7"))).json();
    const networkKey = await deriveGuestNetworkKey("203.0.113.7");
    // The 24-hour limiter is keyed by the hash, so no raw address is kept for the day.
    expect(newSessionLimit.keys).toEqual([`guest-session-new:${networkKey}`]);
    newSessionLimit.allow = false;
    const blocked = await POST(request({ startNew: true }, undefined, undefined, "203.0.113.7"));
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ code: "guest_session_limit" });
    const renewed = await POST(request({}, session.guestToken, undefined, "203.0.113.7"));
    expect(renewed.status).toBe(200);
    expect((await renewed.json()).guestId).toBe(session.guestId);
    expect(newSessionLimit.keys).toHaveLength(2);
  });
  test("renews a v1 credential into one carrying the current network", async () => {
    const ownId = crypto.randomUUID();
    const legacy = await createGuestSessionToken(ownId);
    expect(await networkOf(legacy.guestToken, ownId)).toBeUndefined();
    const renewed = await (await POST(request({}, legacy.guestToken, undefined, "198.51.100.4"))).json();
    expect(renewed.guestId).toBe(ownId);
    expect(await networkOf(renewed.guestToken, ownId)).toBe(await deriveGuestNetworkKey("198.51.100.4"));
    expect(newSessionLimit.keys).toHaveLength(0);
  });
});

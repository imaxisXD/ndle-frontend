import { afterEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { createGuestSessionToken, GUEST_CREDENTIAL_COOKIE, verifyGuestSessionToken } from "@/convex/guestTokens";

vi.mock("@/lib/rateLimit", () => ({ getRateLimit: () => ({ limit: async () => ({ success: true }) }) }));
afterEach(() => vi.useRealTimers());
function request(body: unknown, cookie?: string, origin = "https://ndle.test") {
  return new NextRequest("https://ndle.test/api/guest-session", { method: "POST", headers: { "Content-Type": "application/json", origin, ...(cookie ? { cookie: `${GUEST_CREDENTIAL_COOKIE}=${cookie}` } : {}) }, body: JSON.stringify(body) });
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
  test("rejects requests from another origin", async () => {
    expect((await POST(request({}, undefined, "https://elsewhere.test"))).status).toBe(403);
  });
});

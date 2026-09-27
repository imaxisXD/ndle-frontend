import { describe, expect, it } from "vitest";
import { verifyTurnstile } from "./turnstile";

function siteverify(answer: unknown, ok = true) {
  const sent: URLSearchParams[] = [];
  const impl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    sent.push(new URLSearchParams(String(init?.body)));
    return new Response(JSON.stringify(answer), { status: ok ? 200 : 500 });
  }) as typeof fetch;
  return { impl, sent };
}

describe("verifyTurnstile", () => {
  it("passes when Cloudflare says success, sending the secret, token and IP", async () => {
    const { impl, sent } = siteverify({ success: true });
    await expect(verifyTurnstile("token", "203.0.113.7", "secret", impl)).resolves.toBe(true);
    expect(Object.fromEntries(sent[0])).toEqual({ secret: "secret", response: "token", remoteip: "203.0.113.7" });
  });

  it("fails on a rejected token, an error answer or no token at all", async () => {
    await expect(verifyTurnstile("token", null, "secret", siteverify({ success: false }).impl)).resolves.toBe(false);
    await expect(verifyTurnstile("token", null, "secret", siteverify({}, false).impl)).resolves.toBe(false);
    await expect(verifyTurnstile("", null, "secret", siteverify({ success: true }).impl)).resolves.toBe(false);
  });
});

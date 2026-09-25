import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createGuestSessionToken,
  deriveGuestNetworkKey,
  verifyGuestSessionCredential,
  verifyGuestSessionToken,
} from "./guestTokens";

const DEDICATED_SECRET = "dedicated-guest-secret-for-tests";
const API_SECRET = "api-secret-shared-with-services";
const SHARED_SECRET = "shared-secret-for-internal-calls";
const DAY_MS = 86_400_000;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

/** A token issued while production still signed with a fallback secret. */
async function tokenSignedWith(secret: "API_SECRET" | "SHARED_SECRET") {
  vi.stubEnv("GUEST_SESSION_SECRET", undefined);
  vi.stubEnv("API_SECRET", secret === "API_SECRET" ? API_SECRET : undefined);
  vi.stubEnv("SHARED_SECRET", SHARED_SECRET);
  const guestId = crypto.randomUUID();
  const { guestToken } = await createGuestSessionToken(guestId);
  vi.stubEnv("API_SECRET", API_SECRET);
  return { guestId, guestToken };
}

function useDedicatedSecret(legacyAcceptUntil?: string) {
  vi.stubEnv("GUEST_SESSION_SECRET", DEDICATED_SECRET);
  vi.stubEnv("GUEST_SESSION_LEGACY_ACCEPT_UNTIL", legacyAcceptUntil);
}

describe("guest session signing keys", () => {
  test("without a dedicated secret, the fallback chain signs and verifies as before", async () => {
    const { guestId, guestToken } = await tokenSignedWith("API_SECRET");
    vi.stubEnv(
      "GUEST_SESSION_LEGACY_ACCEPT_UNTIL",
      String(Date.now() + DAY_MS),
    );
    expect(await verifyGuestSessionToken(guestId, guestToken)).toBe(guestId);

    // The legacy window only applies once a dedicated secret replaces the chain.
    const shared = await tokenSignedWith("SHARED_SECRET");
    await expect(
      verifyGuestSessionToken(shared.guestId, shared.guestToken),
    ).rejects.toThrow("Guest session is invalid");
  });

  test.each([
    { signer: "API_SECRET" as const, format: (ms: number) => String(ms) },
    {
      signer: "SHARED_SECRET" as const,
      format: (ms: number) => new Date(ms).toISOString(),
    },
  ])("accepts $signer tokens until the cutoff", async ({ signer, format }) => {
    const { guestId, guestToken } = await tokenSignedWith(signer);
    const cutoff = Date.now() + DAY_MS;
    useDedicatedSecret(format(cutoff));
    expect(await verifyGuestSessionToken(guestId, guestToken)).toBe(guestId);

    vi.useFakeTimers();
    vi.setSystemTime(cutoff);
    await expect(verifyGuestSessionToken(guestId, guestToken)).rejects.toThrow(
      "Guest session is invalid",
    );
  });

  test.each([
    { label: "missing", until: undefined },
    { label: "past", until: String(Date.now() - 1) },
    { label: "free text", until: "next week" },
    { label: "impossible date", until: "2099-02-30T25:00:00Z" },
    { label: "exponent", until: "1e20" },
  ])(
    "rejects fallback-signed tokens when the cutoff is $label",
    async ({ until }) => {
      const { guestId, guestToken } = await tokenSignedWith("API_SECRET");
      useDedicatedSecret(until);
      await expect(
        verifyGuestSessionToken(guestId, guestToken),
      ).rejects.toThrow("Guest session is invalid");
    },
  );

  test("new tokens are signed with the dedicated secret and forged ones still fail", async () => {
    useDedicatedSecret(String(Date.now() + DAY_MS));
    vi.stubEnv("API_SECRET", API_SECRET);
    const guestId = crypto.randomUUID();
    const { guestToken } = await createGuestSessionToken(guestId);
    vi.stubEnv("GUEST_SESSION_LEGACY_ACCEPT_UNTIL", undefined);
    expect(await verifyGuestSessionToken(guestId, guestToken)).toBe(guestId);

    vi.stubEnv("GUEST_SESSION_SECRET", undefined);
    await expect(verifyGuestSessionToken(guestId, guestToken)).rejects.toThrow(
      "Guest session is invalid",
    );

    useDedicatedSecret(String(Date.now() + DAY_MS));
    const [payload, signature] = guestToken.split(".");
    const forged = `${payload}.${signature.slice(0, -2)}${signature.endsWith("AA") ? "BB" : "AA"}`;
    await expect(verifyGuestSessionToken(guestId, forged)).rejects.toThrow(
      "Guest session is invalid",
    );
  });
});

function toBase64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Signs an arbitrary payload with the test secret, as a forger holding the key could. */
async function signed(payload: Record<string, unknown>) {
  const payloadPart = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.GUEST_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadPart),
  );
  return `${payloadPart}.${toBase64Url(new Uint8Array(signature))}`;
}

describe("guest network keys", () => {
  test("v2 tokens carry the network key; v1 tokens still verify without one", async () => {
    const guestId = crypto.randomUUID();
    const networkKey = await deriveGuestNetworkKey("203.0.113.7");
    const { guestToken } = await createGuestSessionToken(guestId, networkKey);
    expect(await verifyGuestSessionCredential(guestId, guestToken)).toEqual({
      guestId,
      networkKey,
    });
    expect(await verifyGuestSessionToken(guestId, guestToken)).toBe(guestId);

    const legacy = await createGuestSessionToken(guestId);
    expect(await verifyGuestSessionCredential(guestId, legacy.guestToken)).toEqual({
      guestId,
      networkKey: undefined,
    });
  });

  test("the network key is covered by the signature and must be well formed", async () => {
    const guestId = crypto.randomUUID();
    const { guestToken } = await createGuestSessionToken(
      guestId,
      await deriveGuestNetworkKey("203.0.113.7"),
    );
    const [payloadPart, signature] = guestToken.split(".");
    const payload = JSON.parse(
      atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/")),
    );
    const swapped = toBase64Url(
      new TextEncoder().encode(
        JSON.stringify({ ...payload, net: await deriveGuestNetworkKey("198.51.100.4") }),
      ),
    );
    await expect(
      verifyGuestSessionCredential(guestId, `${swapped}.${signature}`),
    ).rejects.toThrow("Guest session is invalid");

    const issuedAt = Date.now();
    const base = { guestId, issuedAt, expiresAt: issuedAt + DAY_MS };
    for (const net of [undefined, "", "not-a-key", "A".repeat(32)]) {
      await expect(
        verifyGuestSessionCredential(guestId, await signed({ v: 2, ...base, net })),
      ).rejects.toThrow("Guest session is invalid");
    }
    await expect(
      verifyGuestSessionCredential(guestId, await signed({ v: 3, ...base })),
    ).rejects.toThrow("Guest session is invalid");
    await expect(createGuestSessionToken(guestId, "not-a-key")).rejects.toThrow();
  });

  test("addresses in one IPv6 /64 share a key; mapped IPv4 matches IPv4", async () => {
    const key = deriveGuestNetworkKey;
    expect(await key("2001:db8:1:2::1")).toBe(await key("2001:0DB8:0001:0002:ffff:0:0:9"));
    expect(await key("[2001:db8:1:2::1]")).toBe(await key("2001:db8:1:2::1"));
    expect(await key("2001:db8:1:3::1")).not.toBe(await key("2001:db8:1:2::1"));
    expect(await key("::ffff:203.0.113.7")).toBe(await key("203.0.113.7"));
    expect(await key("203.0.113.8")).not.toBe(await key("203.0.113.7"));
  });

  test("keys change with the signing secret, so they cannot be precomputed", async () => {
    const before = await deriveGuestNetworkKey("203.0.113.7");
    vi.stubEnv("GUEST_SESSION_SECRET", DEDICATED_SECRET);
    expect(await deriveGuestNetworkKey("203.0.113.7")).not.toBe(before);
  });
});

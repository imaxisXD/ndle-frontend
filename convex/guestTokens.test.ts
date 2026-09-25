import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createGuestSessionToken,
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

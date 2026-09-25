import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { createTestBackend } from "./test.setup";
import { createGuestSessionToken, deriveGuestNetworkKey } from "./guestTokens";
import {
  DEFAULT_GUEST_LINKS_PER_HOUR,
  DEFAULT_GUEST_LINKS_PER_NETWORK_PER_DAY,
  getGuestLinksPerHour,
  getGuestLinksPerNetworkPerDay,
} from "./ownership";

type Backend = ReturnType<typeof createTestBackend>;
const HOUR_MS = 3_600_000;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

function setup() {
  // Keep scheduled deletions and sync runs from firing on their own.
  vi.useFakeTimers();
  return createTestBackend();
}

let linkCounter = 0;
/** A brand-new guest session, as `startNew: true` would issue it. */
async function createAsNewGuest(backend: Backend, networkKey?: string) {
  const guestId = crypto.randomUUID();
  const { guestToken } = await createGuestSessionToken(guestId, networkKey);
  linkCounter += 1;
  return backend.mutation(api.urlMainFuction.createGuestUrl, {
    url: `https://example.org/guest-${linkCounter}`,
    guestId,
    guestToken,
  });
}

describe("per-network guest limit", () => {
  test("survives new guest sessions and asks the guest to sign in", async () => {
    const backend = setup();
    const network = await deriveGuestNetworkKey("203.0.113.7");
    for (let index = 0; index < DEFAULT_GUEST_LINKS_PER_NETWORK_PER_DAY; index++) {
      await createAsNewGuest(backend, network);
    }
    await expect(createAsNewGuest(backend, network)).rejects.toThrow(
      "Guest links from your network reached today's limit of 10. Sign in to keep creating links.",
    );

    // Another network is unaffected, and the key is stored on the link.
    const other = await deriveGuestNetworkKey("198.51.100.4");
    const created = await createAsNewGuest(backend, other);
    const row = await backend.run((ctx) => ctx.db.get(created.docId));
    expect(row?.guestNetworkKey).toBe(other);

    // The window is the last 24 hours.
    vi.setSystemTime(Date.now() + 24 * HOUR_MS + 1);
    await expect(createAsNewGuest(backend, network)).resolves.toBeDefined();
  });

  test("GUEST_LINKS_PER_NETWORK_PER_DAY overrides the default", async () => {
    const backend = setup();
    vi.stubEnv("GUEST_LINKS_PER_NETWORK_PER_DAY", "2");
    const network = await deriveGuestNetworkKey("203.0.113.7");
    await createAsNewGuest(backend, network);
    await createAsNewGuest(backend, network);
    await expect(createAsNewGuest(backend, network)).rejects.toThrow(
      "today's limit of 2",
    );
  });

  test("v1 tokens without a network key keep only the per-guest limit", async () => {
    const backend = setup();
    for (let index = 0; index <= DEFAULT_GUEST_LINKS_PER_NETWORK_PER_DAY; index++) {
      await createAsNewGuest(backend);
    }

    const guestId = crypto.randomUUID();
    const { guestToken } = await createGuestSessionToken(guestId);
    for (let index = 0; index < 5; index++) {
      await backend.mutation(api.urlMainFuction.createGuestUrl, {
        url: `https://example.org/same-guest-${index}`,
        guestId,
        guestToken,
      });
    }
    await expect(
      backend.mutation(api.urlMainFuction.createGuestUrl, {
        url: "https://example.org/same-guest-6",
        guestId,
        guestToken,
      }),
    ).rejects.toThrow("Guest mode allows up to 5 links each day.");
  });
});

describe("global guest circuit breaker", () => {
  test("pauses guest links across all networks once the hourly limit is reached", async () => {
    const backend = setup();
    vi.stubEnv("GUEST_LINKS_PER_HOUR", "3");
    for (const ip of ["203.0.113.1", "203.0.113.2", "203.0.113.3"]) {
      await createAsNewGuest(backend, await deriveGuestNetworkKey(ip));
    }
    await expect(
      createAsNewGuest(backend, await deriveGuestNetworkKey("203.0.113.4")),
    ).rejects.toThrow("Guest links are paused for now");
    await expect(createAsNewGuest(backend)).rejects.toThrow(
      "Guest links are paused for now",
    );

    // Signed-in links are not guest links.
    await backend.run((ctx) =>
      ctx.db.insert("users", {
        name: "Account",
        email: "account@example.test",
        membership: "free",
        tokenIdentifier: "account",
      }),
    );
    await expect(
      backend
        .withIdentity({ tokenIdentifier: "account" })
        .mutation(api.urlMainFuction.createUrl, {
          url: "https://example.com/signed-in",
          slugType: "random",
          trackingEnabled: true,
        }),
    ).resolves.toBeDefined();

    vi.setSystemTime(Date.now() + HOUR_MS + 1);
    await expect(
      createAsNewGuest(backend, await deriveGuestNetworkKey("203.0.113.4")),
    ).resolves.toBeDefined();
  });

  test("a limit of 0 stops guest creation entirely", async () => {
    const backend = setup();
    vi.stubEnv("GUEST_LINKS_PER_HOUR", "0");
    await expect(createAsNewGuest(backend)).rejects.toThrow(
      "Guest links are paused for now",
    );
  });

  test("unusable settings fall back to the defaults", () => {
    for (const value of ["", "abc", "-1", "1.5"]) {
      vi.stubEnv("GUEST_LINKS_PER_HOUR", value);
      vi.stubEnv("GUEST_LINKS_PER_NETWORK_PER_DAY", value);
      expect(getGuestLinksPerHour()).toBe(DEFAULT_GUEST_LINKS_PER_HOUR);
      expect(getGuestLinksPerNetworkPerDay()).toBe(
        DEFAULT_GUEST_LINKS_PER_NETWORK_PER_DAY,
      );
    }
    // Reads stay bounded even when an operator sets a huge limit.
    vi.stubEnv("GUEST_LINKS_PER_HOUR", "999999");
    expect(getGuestLinksPerHour()).toBe(5_000);
  });
});

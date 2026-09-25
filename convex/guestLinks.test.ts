import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createTestBackend } from "./test.setup";
import { createGuestSessionToken } from "./guestTokens";
import { redirectValue } from "./serviceSync";
import { GUEST_LINK_TTL_MS } from "./ownership";

type Backend = ReturnType<typeof createTestBackend>;

afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  // Keep scheduled deletions and sync runs from firing on their own.
  vi.useFakeTimers();
  const backend = createTestBackend();
  const userId = await backend.run((ctx) =>
    ctx.db.insert("users", {
      name: "Test",
      email: "test@example.test",
      membership: "free",
      tokenIdentifier: "account",
    }),
  );
  return {
    backend,
    userId,
    client: backend.withIdentity({ tokenIdentifier: "account" }),
  };
}

async function createGuestLink(backend: Backend) {
  const guestId = crypto.randomUUID();
  const token = await createGuestSessionToken(guestId);
  const link = await backend.mutation(api.urlMainFuction.createGuestUrl, {
    url: "https://example.org/guest",
    guestId,
    guestToken: token.guestToken,
  });
  return { guestId, token, link };
}

async function runScheduledDeletion(backend: Backend, urlId: Id<"urls">) {
  vi.setSystemTime(Date.now() + GUEST_LINK_TTL_MS + 1000);
  await backend.mutation(internal.urlMainFuction.deleteUrlById, { urlId });
  return backend.run((ctx) => ctx.db.get(urlId));
}

describe("guest link lifetime", () => {
  test("claiming removes the guest expiry before the link is projected", async () => {
    const { backend, client, userId } = await setup();
    const { guestId, token, link } = await createGuestLink(backend);
    const guestRow = await backend.run((ctx) => ctx.db.get(link.docId));
    expect(redirectValue(guestRow!).expires_at).toBe(link.expiresAt);

    await client.mutation(api.users.store, {
      guestId,
      guestToken: token.guestToken,
    });

    const claimed = await backend.run((ctx) => ctx.db.get(link.docId));
    expect(claimed).toMatchObject({
      userTableId: userId,
      ownershipState: "user",
    });
    expect(claimed?.claimedAt).toBeTypeOf("number");
    expect(claimed?.expiresAt).toBeUndefined();
    expect(redirectValue(claimed!).expires_at).toBeNull();
    const redirectJob = await backend.run((ctx) =>
      ctx.db
        .query("serviceSyncJobs")
        .withIndex("by_key", (q) => q.eq("key", `redirect:${link.slug}`))
        .unique(),
    );
    expect(redirectJob?.status).toBe("pending");
  });

  test("the original scheduled deletion keeps a claimed link", async () => {
    const { backend, client } = await setup();
    const { guestId, token, link } = await createGuestLink(backend);
    const scheduled = await backend.run((ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    );
    expect(
      scheduled.some((job) =>
        job.name.includes("urlMainFuction:deleteUrlById"),
      ),
    ).toBe(true);
    await client.mutation(api.users.store, {
      guestId,
      guestToken: token.guestToken,
    });

    expect(await runScheduledDeletion(backend, link.docId)).not.toBeNull();
  });

  test("a link claimed before the fix is kept even while it still has the old expiry", async () => {
    const { backend, userId } = await setup();
    const { link } = await createGuestLink(backend);
    await backend.run((ctx) =>
      ctx.db.patch(link.docId, {
        userTableId: userId,
        ownershipState: "user",
        claimedAt: Date.now(),
      }),
    );

    expect(await runScheduledDeletion(backend, link.docId)).not.toBeNull();
  });

  test("an unclaimed guest link is still deleted when it expires", async () => {
    const { backend } = await setup();
    const { link } = await createGuestLink(backend);

    expect(await runScheduledDeletion(backend, link.docId)).toBeNull();
  });

  test("a link created signed in with its own expiry is still deleted once due", async () => {
    const { backend, client } = await setup();
    const expiresAt = Date.now() + 86_400_000;
    const link = await client.mutation(api.urlMainFuction.createUrl, {
      url: "https://example.com/campaign",
      slugType: "random",
      trackingEnabled: true,
      expiresAt,
    });

    await backend.mutation(internal.urlMainFuction.deleteUrlById, {
      urlId: link.docId,
    });
    expect(await backend.run((ctx) => ctx.db.get(link.docId))).not.toBeNull();

    vi.setSystemTime(expiresAt);
    await backend.mutation(internal.urlMainFuction.deleteUrlById, {
      urlId: link.docId,
    });
    expect(await backend.run((ctx) => ctx.db.get(link.docId))).toBeNull();
  });
});

describe("clearClaimedGuestExpiry migration", () => {
  test("clears stale guest expiry on claimed links only, queues sync, and is repeatable", async () => {
    const { backend, client, userId } = await setup();
    const stale = await createGuestLink(backend);
    const unclaimed = await createGuestLink(backend);
    await backend.run((ctx) =>
      ctx.db.patch(stale.link.docId, {
        userTableId: userId,
        ownershipState: "user",
        claimedAt: Date.now(),
      }),
    );
    const ownExpiry = Date.now() + 86_400_000;
    const signedIn = await client.mutation(api.urlMainFuction.createUrl, {
      url: "https://example.com/own-expiry",
      slugType: "random",
      trackingEnabled: true,
      expiresAt: ownExpiry,
    });
    const jobVersion = () =>
      backend.run(
        async (ctx) =>
          (
            await ctx.db
              .query("serviceSyncJobs")
              .withIndex("by_key", (q) =>
                q.eq("key", `redirect:${stale.link.slug}`),
              )
              .unique()
          )?.version,
      );
    const before = await jobVersion();
    vi.advanceTimersByTime(1000);

    expect(
      await backend.mutation(internal.backfill.clearClaimedGuestExpiry, {}),
    ).toEqual({
      scanned: 3,
      patched: 1,
      isDone: true,
    });
    const rows = await backend.run(async (ctx) => ({
      stale: await ctx.db.get(stale.link.docId),
      unclaimed: await ctx.db.get(unclaimed.link.docId),
      signedIn: await ctx.db.get(signedIn.docId),
    }));
    expect(rows.stale?.expiresAt).toBeUndefined();
    expect(rows.unclaimed?.expiresAt).toBe(unclaimed.link.expiresAt);
    expect(rows.signedIn?.expiresAt).toBe(ownExpiry);
    expect(await jobVersion()).toBeGreaterThan(before!);

    expect(
      await backend.mutation(internal.backfill.clearClaimedGuestExpiry, {}),
    ).toMatchObject({
      patched: 0,
    });
  });

  test("continues in bounded pages", async () => {
    const { backend, userId } = await setup();
    await backend.run(async (ctx) => {
      for (let index = 0; index < 101; index++)
        await ctx.db.insert("urls", {
          fullurl: `https://example.com/${index}`,
          shortUrl: `claimed${index}`,
          slugAssigned: `claimed${index}`,
          trackingEnabled: true,
          userTableId: userId,
          ownershipState: "user",
          claimedAt: Date.now(),
          expiresAt: Date.now() + GUEST_LINK_TTL_MS,
        });
    });

    expect(
      await backend.mutation(internal.backfill.clearClaimedGuestExpiry, {}),
    ).toEqual({
      scanned: 100,
      patched: 100,
      isDone: false,
    });
    const next = (
      await backend.run((ctx) =>
        ctx.db.system.query("_scheduled_functions").collect(),
      )
    ).find((job) => job.name.includes("backfill:clearClaimedGuestExpiry"));
    expect(next).toBeDefined();
    expect(
      await backend.mutation(
        internal.backfill.clearClaimedGuestExpiry,
        next!.args[0] as { cursor: string },
      ),
    ).toEqual({ scanned: 1, patched: 1, isDone: true });
    const remaining = await backend.run(async (ctx) =>
      (await ctx.db.query("urls").collect()).filter(
        (url) => url.expiresAt !== undefined,
      ),
    );
    expect(remaining).toHaveLength(0);
  });
});

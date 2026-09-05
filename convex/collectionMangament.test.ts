import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { createTestBackend } from "./test.setup";
import { accountCounter } from "./accountCounters";
import {
  addLinkToCollection,
  incrementCollectionClicks,
  removeLinkFromCollections,
} from "./collectionMangament";
import type { Id } from "./_generated/dataModel";

async function setup() {
  const backend = createTestBackend();
  const identity = { tokenIdentifier: "collection-owner" };
  const userId = await backend.run((ctx) =>
    ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: "Owner",
      email: "owner@example.test",
      membership: "pro",
    }),
  );
  return { backend, userId, client: backend.withIdentity(identity) };
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("collection membership", () => {
  test("migrates in batches and preserves clicks and additions made during the update", async () => {
    vi.useFakeTimers();
    const { backend, userId, client } = await setup();
    const { collectionId, urls } = await backend.run(async (ctx) => {
      const urls: Id<"urls">[] = [];
      for (let index = 0; index < 105; index++) {
        const id = await ctx.db.insert("urls", {
          fullurl: `https://example.test/${index}`,
          shortUrl: `link-${index}`,
          userTableId: userId,
          trackingEnabled: true,
        });
        await accountCounter.add(ctx, `url:${id}`, 2);
        urls.push(id);
      }
      const collectionId = await ctx.db.insert("collections", {
        userTableId: userId,
        name: "Legacy",
        urls,
      });
      return { urls, collectionId };
    });
    await backend.mutation(
      internal.collectionMangament.migrateCollectionMembers,
      {},
    );
    expect(
      (await client.query(api.collectionMangament.getUserCollections, {}))[0]
        .totalClickCount,
    ).toBeNull();
    expect(
      await backend.run((ctx) => ctx.db.query("collectionLinks").collect()),
    ).toHaveLength(100);
    await backend.run(async (ctx) => {
      // The last legacy member is not copied yet. Its baseline must include this click.
      await accountCounter.inc(ctx, `url:${urls[104]}`);
      await incrementCollectionClicks(ctx, urls[104]);
      const newUrl = await ctx.db.insert("urls", {
        fullurl: "https://example.test/new",
        shortUrl: "new",
        userTableId: userId,
        trackingEnabled: true,
      });
      await accountCounter.add(ctx, `url:${newUrl}`, 7);
      await addLinkToCollection(ctx, collectionId, newUrl);
      await addLinkToCollection(ctx, collectionId, newUrl);
    });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
    const collection = await client.query(
      api.collectionMangament.getCollectionById,
      { collectionId },
    );
    expect(collection?.membersReady).toBe(true);
    expect(collection?.urls).toEqual([]);
    const summary = (
      await client.query(api.collectionMangament.getUserCollections, {})
    )[0];
    expect(summary.urlCount).toBe(106);
    expect(summary.totalClickCount).toBe(218);
    const first = await client.query(api.urlLists.getUserUrlsPage, {
      collectionId,
      paginationOpts: { cursor: null, numItems: 50 },
    });
    expect(first.page).toHaveLength(50);
    expect(first.isDone).toBe(false);
    const second = await client.query(api.urlLists.getUserUrlsPage, {
      collectionId,
      paginationOpts: { cursor: first.continueCursor, numItems: 50 },
    });
    expect(second.page).toHaveLength(50);
    expect(
      new Set([...first.page, ...second.page].map((row) => row._id)).size,
    ).toBe(100);
    expect(
      await client.query(api.urlLists.getUrlListCount, { collectionId }),
    ).toBe(106);
  });

  test("deleting a link during deferred click delivery keeps every collection total at zero", async () => {
    vi.useFakeTimers();
    const { backend, userId } = await setup();
    const { urlId, collectionIds } = await backend.run(async (ctx) => {
      const urlId = await ctx.db.insert("urls", {
        fullurl: "https://example.test",
        shortUrl: "shared",
        userTableId: userId,
        trackingEnabled: true,
      });
      await accountCounter.add(ctx, `url:${urlId}`, 5);
      const collectionIds: Id<"collections">[] = [];
      for (let index = 0; index < 102; index++) {
        const id = await ctx.db.insert("collections", {
          userTableId: userId,
          name: `Collection ${index}`,
          urls: [],
          membersReady: true,
          linkCount: 0,
        });
        await addLinkToCollection(ctx, id, urlId);
        collectionIds.push(id);
      }
      return { urlId, collectionIds };
    });
    await backend.run(async (ctx) => {
      await accountCounter.inc(ctx, `url:${urlId}`);
      await incrementCollectionClicks(ctx, urlId);
      await removeLinkFromCollections(ctx, urlId);
      await ctx.db.delete(urlId);
    });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
    expect(
      await backend.run((ctx) => ctx.db.query("collectionLinks").collect()),
    ).toHaveLength(0);
    expect(
      await backend.run((ctx) =>
        Promise.all(
          collectionIds.map((id) =>
            accountCounter.count(ctx, `collection-v2:${id}`),
          ),
        ),
      ),
    ).toEqual(Array(102).fill(0));
    expect(
      (await backend.run((ctx) => ctx.db.query("collections").collect())).every(
        (collection) => collection.linkCount === 0,
      ),
    ).toBe(true);
  });

  test("membership added after a click baseline is not counted again by deferred delivery", async () => {
    vi.useFakeTimers();
    const { backend, userId } = await setup();
    const urlId = await backend.run(async (ctx) => {
      const urlId = await ctx.db.insert("urls", {
        fullurl: "https://example.test",
        shortUrl: "shared",
        userTableId: userId,
        trackingEnabled: true,
      });
      for (let index = 0; index < 101; index++) {
        const id = await ctx.db.insert("collections", {
          userTableId: userId,
          name: `Collection ${index}`,
          urls: [],
          membersReady: true,
        });
        await addLinkToCollection(ctx, id, urlId);
      }
      await accountCounter.inc(ctx, `url:${urlId}`);
      await incrementCollectionClicks(ctx, urlId);
      return urlId;
    });
    // Keep the clock fixed: memberships created later still sort after the saved cutoff.
    const addedId = await backend.run(async (ctx) => {
      const id = await ctx.db.insert("collections", {
        userTableId: userId,
        name: "Added after click",
        urls: [],
        membersReady: true,
      });
      await addLinkToCollection(ctx, id, urlId);
      return id;
    });
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
    expect(
      await backend.run((ctx) =>
        accountCounter.count(ctx, `collection-v2:${addedId}`),
      ),
    ).toBe(1);
  });

  test("migration skips deleted legacy links and does not restore their membership", async () => {
    vi.useFakeTimers();
    const { backend, userId, client } = await setup();
    const collectionId = await backend.run(async (ctx) => {
      const kept = await ctx.db.insert("urls", {
        fullurl: "https://example.test/kept",
        shortUrl: "kept",
        userTableId: userId,
        trackingEnabled: true,
      });
      const deleted = await ctx.db.insert("urls", {
        fullurl: "https://example.test/deleted",
        shortUrl: "deleted",
        userTableId: userId,
        trackingEnabled: true,
      });
      const id = await ctx.db.insert("collections", {
        userTableId: userId,
        name: "Legacy deletion",
        urls: [kept, deleted],
      });
      await accountCounter.add(ctx, `url:${kept}`, 3);
      await accountCounter.add(ctx, `url:${deleted}`, 9);
      await removeLinkFromCollections(ctx, deleted);
      await ctx.db.delete(deleted);
      return id;
    });
    await backend.mutation(
      internal.collectionMangament.migrateCollectionMembers,
      {},
    );
    await backend.finishAllScheduledFunctions(vi.runAllTimers);
    const summary = (
      await client.query(api.collectionMangament.getUserCollections, {})
    )[0];
    expect(summary.urlCount).toBe(1);
    expect(summary.totalClickCount).toBe(3);
    expect(
      (
        await client.query(api.urlLists.getUserUrlsPage, {
          collectionId,
          paginationOpts: { cursor: null, numItems: 25 },
        })
      ).page,
    ).toHaveLength(1);
  });

  test("available-link pagination can advance past a page containing only existing members", async () => {
    const { backend, userId, client } = await setup();
    const { collectionId, oldestId } = await backend.run(async (ctx) => {
      const collectionId = await ctx.db.insert("collections", {
        userTableId: userId,
        name: "Picked",
        urls: [],
        membersReady: true,
      });
      const oldestId = await ctx.db.insert("urls", {
        fullurl: "https://example.test/old",
        shortUrl: "old",
        userTableId: userId,
        trackingEnabled: true,
      });
      for (let index = 0; index < 2; index++) {
        const urlId = await ctx.db.insert("urls", {
          fullurl: `https://example.test/${index}`,
          shortUrl: `member-${index}`,
          userTableId: userId,
          trackingEnabled: true,
        });
        await addLinkToCollection(ctx, collectionId, urlId);
      }
      return { collectionId, oldestId };
    });
    const first = await client.query(api.urlLists.getAvailableUrlsPage, {
      collectionId,
      paginationOpts: { cursor: null, numItems: 2 },
    });
    expect(first.page).toEqual([]);
    expect(first.isDone).toBe(false);
    const second = await client.query(api.urlLists.getAvailableUrlsPage, {
      collectionId,
      paginationOpts: { cursor: first.continueCursor, numItems: 2 },
    });
    expect(second.page.map((row) => row._id)).toEqual([oldestId]);
    expect(second.isDone).toBe(true);
    const other = backend.withIdentity({ tokenIdentifier: "someone-else" });
    expect(
      (
        await other.query(api.urlLists.getUserUrlsPage, {
          collectionId,
          paginationOpts: { cursor: null, numItems: 25 },
        })
      ).page,
    ).toEqual([]);
    await expect(
      other.mutation(api.collectionMangament.addUrlToCollection, {
        collectionId,
        urlId: oldestId,
      }),
    ).rejects.toThrow("access denied");
  });
});

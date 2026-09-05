import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { createTestBackend } from "./test.setup";
import { createGuestSessionToken } from "./guestTokens";

afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
async function setup(trackingEnabled = true) {
  vi.stubEnv("SHARED_SECRET", "local-click-test");
  const backend = createTestBackend();
  const userId = await backend.run(ctx => ctx.db.insert("users", { name: "Test", email: "test@example.test", membership: "pro", tokenIdentifier: "account" }));
  const client = backend.withIdentity({ tokenIdentifier: "account" });
  const link = await client.mutation(api.urlMainFuction.createUrl, { url: "https://example.com/test", slugType: "random", trackingEnabled });
  const event = { urlId: link.docId, sharedSecret: "local-click-test", urlStatusMessage: "success", urlStatusCode: 302, requestId: "click-one", clickEvent: { linkSlug: link.slug, occurredAt: Date.now(), country: "IN", deviceType: "desktop", browser: "Chrome", os: "macOS" } };
  return { backend, client, userId, link, event };
}
describe("click delivery", () => {
  test("retries increment the link/account once and never overwrite destination health", async () => {
    const { backend, client, event, link } = await setup();
    const first = await backend.mutation(api.urlAnalytics.mutateUrlAnalytics, event);
    const second = await backend.mutation(api.urlAnalytics.mutateUrlAnalytics, event);
    expect(first.outcome).toBe("recorded"); expect(second.outcome).toBe("duplicate");
    expect(await client.query(api.urlAnalytics.getUsersTotalClicks, {})).toBe(1);
    expect((await client.query(api.urlAnalytics.getUrlAnalytics, { urlSlug: link.slug })).analytics?.totalClickCounts).toBe(1);
    const analytics = await backend.run(ctx => ctx.db.query("urlAnalytics").first());
    expect(analytics?.urlStatusCode).toBe(0);
  });
  test("deleted and disabled links have explicit terminal outcomes", async () => {
    const { backend, client, event, link } = await setup(false);
    expect((await backend.mutation(api.urlAnalytics.mutateUrlAnalytics, event)).outcome).toBe("tracking_disabled");
    await client.mutation(api.urlMainFuction.deleteUrl, { urlSlug: link.slug });
    expect((await backend.mutation(api.urlAnalytics.mutateUrlAnalytics, event)).outcome).toBe("link_deleted");
    expect(await client.query(api.urlAnalytics.getUsersLinkCount, {})).toBe(0);
  });
  test("receipts survive the retry window and too-old events cannot recount after cleanup", async () => {
    const { backend, event } = await setup();
    await backend.mutation(api.urlAnalytics.mutateUrlAnalytics, event);
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 36 * 86400_000);
    await backend.mutation(internal.architectureMigration.trimLiveHistory, {});
    expect(await backend.run(ctx => ctx.db.query("processedClickRequests").collect())).toHaveLength(0);
    expect((await backend.mutation(api.urlAnalytics.mutateUrlAnalytics, event)).outcome).toBe("too_old");
  });
  test("existing account counter migration is repeatable and includes concurrent clicks once", async () => {
    const { backend, client, event, link } = await setup();
    await backend.mutation(api.urlAnalytics.mutateUrlAnalytics, event);
    await backend.run(async ctx => {
      // Model an old link whose existing URL counter is the only source of its counts.
      const oldId = await ctx.db.insert("urls", { fullurl: "https://example.com/old", shortUrl: "old", slugAssigned: "old", userTableId: (await ctx.db.get(link.docId))!.userTableId, trackingEnabled: true });
      await ctx.db.insert("urlAnalytics", { urlId: oldId, updatedAt: Date.now() });
    });
    expect(await client.query(api.urlAnalytics.getUsersTotalClicks, {})).toBeNull();
    await backend.mutation(internal.architectureMigration.advance, {});
    await backend.mutation(internal.architectureMigration.advance, {});
    expect(await client.query(api.urlAnalytics.getUsersTotalClicks, {})).toBe(1);
    expect(await client.query(api.urlAnalytics.getUsersLinkCount, {})).toBe(2);
    await client.mutation(api.urlMainFuction.deleteUrl, { urlSlug: link.slug });
    expect(await client.query(api.urlAnalytics.getUsersTotalClicks, {})).toBe(0);
  });
  test("claiming guest links keeps history immutable and transfers counts and archive ownership", async () => {
    const { backend, client } = await setup();
    const guestId = crypto.randomUUID();
    const token = await createGuestSessionToken(guestId);
    const guest = await backend.mutation(api.urlMainFuction.createGuestUrl, { url: "https://example.org/guest", guestId, guestToken: token.guestToken });
    for (let index = 0; index < 4; index++) await backend.mutation(api.urlAnalytics.mutateUrlAnalytics, {
      urlId: guest.docId, sharedSecret: "local-click-test", urlStatusMessage: "success", urlStatusCode: 302, requestId: `guest-${index}`,
      clickEvent: { linkSlug: guest.slug, occurredAt: Date.now(), country: "IN", deviceType: "desktop", browser: "Chrome", os: "macOS" },
    });
    const before = await backend.run(ctx => ctx.db.query("clickEvents").collect());
    const claimed = await client.mutation(api.users.store, { guestId, guestToken: token.guestToken });
    expect(claimed.claimedLinkCount).toBe(1);
    expect(await backend.run(ctx => ctx.db.query("clickEvents").collect())).toEqual(before);
    expect(await client.query(api.urlAnalytics.getUsersTotalClicks, {})).toBe(4);
    expect(await client.query(api.clickEvents.getRecentByLinkSlug, { linkSlug: guest.slug })).toHaveLength(4);
    const ownerJob = await backend.run(ctx => ctx.db.query("serviceSyncJobs").withIndex("by_key", q => q.eq("key", `owner:${claimed.id}:guest:${guestId}`)).unique());
    expect(ownerJob?.target).toMatchObject({ ownerKeys: expect.arrayContaining([`guest:${guestId}`]) });
    expect((await client.mutation(api.users.store, { guestId, guestToken: token.guestToken })).claimedLinkCount).toBe(0);
    expect(await client.query(api.urlAnalytics.getUsersTotalClicks, {})).toBe(4);
  });
});

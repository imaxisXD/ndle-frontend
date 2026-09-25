import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createTestBackend } from "./test.setup";
import { redirectValue } from "./serviceSync";

type Backend = ReturnType<typeof createTestBackend>;
const domain = "links.example.test";

afterEach(() => {
  vi.useRealTimers();
});

async function setup() {
  // Keep queued sync runs from firing on their own.
  vi.useFakeTimers();
  const backend = createTestBackend();
  const identity = { tokenIdentifier: "domain-owner" };
  const { userId, otherUserId, domainId } = await backend.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name: "Domain owner",
      email: "domain@example.test",
      membership: "pro",
      tokenIdentifier: identity.tokenIdentifier,
    });
    const otherUserId = await ctx.db.insert("users", {
      name: "Other owner",
      email: "other@example.test",
      membership: "pro",
      tokenIdentifier: "other-owner",
    });
    const domainId = await ctx.db.insert("custom_domains", {
      userId,
      domain,
      status: "active",
      createdAt: Date.now(),
    });
    return { userId, otherUserId, domainId };
  });
  return {
    backend,
    client: backend.withIdentity(identity),
    userId,
    otherUserId,
    domainId,
  };
}

function insertLink(
  backend: Backend,
  slug: string,
  userTableId: Id<"users">,
  customDomain?: string,
) {
  return backend.run((ctx) =>
    ctx.db.insert("urls", {
      fullurl: `https://example.com/${slug}`,
      shortUrl: slug,
      slugAssigned: slug,
      trackingEnabled: true,
      userTableId,
      ownershipState: "user",
      customDomain,
    }),
  );
}

function redirectJob(backend: Backend, slug: string) {
  return backend.run((ctx) =>
    ctx.db
      .query("serviceSyncJobs")
      .withIndex("by_key", (q) => q.eq("key", `redirect:${slug}`))
      .unique(),
  );
}

async function scheduledDetach(backend: Backend) {
  const jobs = await backend.run((ctx) =>
    ctx.db.system.query("_scheduled_functions").collect(),
  );
  return jobs.find(
    (job) =>
      job.name.includes("customDomains:detachDomainLinks") &&
      job.state.kind === "pending",
  );
}

describe("custom domain links in the redirect projection", () => {
  test("the projection carries the normalized hostname, or null on the default domain", async () => {
    const { backend, client } = await setup();
    const created = await client.mutation(api.urlMainFuction.createUrl, {
      url: "https://example.com/branded",
      slugType: "random",
      trackingEnabled: true,
      customDomain: "https://Links.Example.test/",
    });
    const plain = await client.mutation(api.urlMainFuction.createUrl, {
      url: "https://example.com/plain",
      slugType: "random",
      trackingEnabled: true,
    });
    const rows = await backend.run(async (ctx) => ({
      branded: await ctx.db.get(created.docId),
      plain: await ctx.db.get(plain.docId),
    }));
    expect(rows.branded?.customDomain).toBe(domain);
    expect(redirectValue(rows.branded!).domain).toBe(domain);
    expect(redirectValue(rows.plain!).domain).toBeNull();
    // Rows written before normalization still project the canonical host.
    expect(
      redirectValue({
        ...rows.branded!,
        customDomain: "Links.Example.TEST.:443",
      }).domain,
    ).toBe(domain);
    // A second "www." label is part of the stored hostname and must be kept.
    expect(
      redirectValue({
        ...rows.branded!,
        customDomain: "www.links.example.test",
      }).domain,
    ).toBe("www.links.example.test");
  });
});

describe("deleting a custom domain", () => {
  test("detaches the owner's links from the hostname and re-projects them", async () => {
    const { backend, client, userId, otherUserId, domainId } = await setup();
    const attached = await insertLink(backend, "attached", userId, domain);
    const otherHost = await insertLink(
      backend,
      "otherhost",
      userId,
      "go.example.test",
    );
    const plain = await insertLink(backend, "plain", userId);
    const otherOwner = await insertLink(
      backend,
      "otherowner",
      otherUserId,
      domain,
    );

    expect(
      await client.mutation(api.customDomains.deleteDomain, { domainId }),
    ).toEqual({
      success: true,
    });

    const rows = await backend.run(async (ctx) => ({
      attached: await ctx.db.get(attached),
      otherHost: await ctx.db.get(otherHost),
      plain: await ctx.db.get(plain),
      otherOwner: await ctx.db.get(otherOwner),
    }));
    expect(rows.attached?.customDomain).toBeUndefined();
    expect(redirectValue(rows.attached!).domain).toBeNull();
    expect(rows.otherHost?.customDomain).toBe("go.example.test");
    // Only the deleting owner's links are in scope for this deletion.
    expect(rows.otherOwner?.customDomain).toBe(domain);
    expect(await redirectJob(backend, "attached")).toMatchObject({
      status: "pending",
      target: { kind: "redirect", urlId: attached },
    });
    expect(await redirectJob(backend, "otherhost")).toBeNull();
    expect(await redirectJob(backend, "plain")).toBeNull();
    expect(await scheduledDetach(backend)).toBeUndefined();
  });

  test("continues in bounded pages for owners with many links", async () => {
    const { backend, client, userId, domainId } = await setup();
    await backend.run(async (ctx) => {
      for (let index = 0; index < 101; index++)
        await ctx.db.insert("urls", {
          fullurl: `https://example.com/${index}`,
          shortUrl: `link${index}`,
          slugAssigned: `link${index}`,
          trackingEnabled: true,
          userTableId: userId,
          ownershipState: "user",
          customDomain: domain,
        });
    });

    await client.mutation(api.customDomains.deleteDomain, { domainId });
    const attachedCount = async () =>
      (await backend.run((ctx) => ctx.db.query("urls").collect())).filter(
        (url) => url.customDomain,
      ).length;
    expect(await attachedCount()).toBe(1);

    const next = await scheduledDetach(backend);
    expect(next).toBeDefined();
    await backend.mutation(
      internal.customDomains.detachDomainLinks,
      next!.args[0] as {
        userId: Id<"users">;
        hostname: string;
        cursor: string;
      },
    );
    expect(await attachedCount()).toBe(0);
  });

  test("a continuation stops once the owner has added the hostname back", async () => {
    const { backend, userId } = await setup();
    const attached = await insertLink(backend, "attached", userId, domain);

    await backend.mutation(internal.customDomains.detachDomainLinks, {
      userId,
      hostname: domain,
      cursor: null,
    });

    expect(
      (await backend.run((ctx) => ctx.db.get(attached)))?.customDomain,
    ).toBe(domain);
  });
});

describe("detachOrphanedCustomDomainLinks migration", () => {
  test("detaches links whose owner no longer holds the hostname and is repeatable", async () => {
    const { backend, userId, otherUserId } = await setup();
    const held = await insertLink(backend, "held", userId, domain);
    const takenOver = await insertLink(
      backend,
      "takenover",
      otherUserId,
      domain,
    );
    const deletedDomain = await insertLink(
      backend,
      "deleteddomain",
      userId,
      "old.example.test",
    );
    const plain = await insertLink(backend, "plain", userId);

    expect(
      await backend.mutation(
        internal.backfill.detachOrphanedCustomDomainLinks,
        {},
      ),
    ).toEqual({ scanned: 4, patched: 2, isDone: true });
    const rows = await backend.run(async (ctx) => ({
      held: await ctx.db.get(held),
      takenOver: await ctx.db.get(takenOver),
      deletedDomain: await ctx.db.get(deletedDomain),
      plain: await ctx.db.get(plain),
    }));
    expect(rows.held?.customDomain).toBe(domain);
    expect(rows.takenOver?.customDomain).toBeUndefined();
    expect(rows.deletedDomain?.customDomain).toBeUndefined();
    expect(await redirectJob(backend, "takenover")).not.toBeNull();
    expect(await redirectJob(backend, "held")).toBeNull();
    expect(
      await backend.mutation(
        internal.backfill.detachOrphanedCustomDomainLinks,
        {},
      ),
    ).toMatchObject({ patched: 0 });
  });
});

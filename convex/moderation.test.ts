import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createTestBackend } from "./test.setup";
import { createGuestSessionToken } from "./guestTokens";
import * as moderation from "./moderation";
import { redirectValue } from "./serviceSync";
import { isValidHttpUrl } from "./utils";

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
      name: "Owner",
      email: "owner@example.test",
      membership: "pro",
      tokenIdentifier: "owner",
    }),
  );
  return { backend, userId, client: backend.withIdentity({ tokenIdentifier: "owner" }) };
}

function insertLink(
  backend: Backend,
  slug: string,
  fullurl: string,
  extra: { userTableId?: Id<"users">; abVariants?: Array<{ url: string; weight: number }> } = {},
) {
  return backend.run((ctx) =>
    ctx.db.insert("urls", {
      fullurl,
      shortUrl: slug,
      slugAssigned: slug,
      trackingEnabled: true,
      ownershipState: extra.userTableId ? "user" : "guest",
      guestId: extra.userTableId ? undefined : crypto.randomUUID(),
      ...extra,
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

async function projection(backend: Backend, urlId: Id<"urls">) {
  const url = await backend.run((ctx) => ctx.db.get(urlId));
  return redirectValue(url!);
}

async function guestCreate(backend: Backend, url: string) {
  const guestId = crypto.randomUUID();
  const { guestToken } = await createGuestSessionToken(guestId);
  return backend.mutation(api.urlMainFuction.createGuestUrl, {
    url,
    guestId,
    guestToken,
  });
}

describe("moderation tools", () => {
  test("are internal functions only", () => {
    const registered = Object.values(moderation as Record<string, unknown>).filter(
      (value): value is { isPublic?: boolean; isInternal?: boolean } =>
        typeof value === "function" && ("isInternal" in value || "isPublic" in value),
    );
    expect(registered.length).toBe(5);
    expect(registered.every((fn) => fn.isInternal && !fn.isPublic)).toBe(true);
  });
});

describe("disabling a link", () => {
  test("projects is_active: false, and enabling restores it", async () => {
    const { backend, userId, client } = await setup();
    const urlId = await insertLink(backend, "phish1", "https://example.com/a", { userTableId: userId });
    expect((await projection(backend, urlId)).is_active).toBe(true);

    expect(
      await backend.mutation(internal.moderation.disableLink, {
        slug: "https://ndle.fyi/phish1",
        reason: "Reported phishing",
      }),
    ).toEqual({ urlId, slug: "phish1", alreadyDisabled: false });
    const disabled = await backend.run((ctx) => ctx.db.get(urlId));
    expect(disabled).toMatchObject({ disabledReason: "Reported phishing" });
    expect(disabled?.disabledAt).toBeTypeOf("number");
    expect((await projection(backend, urlId)).is_active).toBe(false);
    expect(await redirectJob(backend, "phish1")).toMatchObject({ status: "pending" });

    // The owner sees the link as disabled, but not the moderation notes.
    const page = await client.query(api.urlLists.getUserUrlsPage, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page[0].disabledAt).toBe(disabled?.disabledAt);
    expect(page.page[0]).not.toHaveProperty("disabledReason");

    expect(
      await backend.mutation(internal.moderation.enableLink, { slug: "phish1" }),
    ).toEqual({ urlId, slug: "phish1", wasDisabled: true });
    const enabled = await backend.run((ctx) => ctx.db.get(urlId));
    expect(enabled?.disabledAt).toBeUndefined();
    expect(enabled?.disabledReason).toBeUndefined();
    expect((await projection(backend, urlId)).is_active).toBe(true);
  });

  test("unknown slugs are reported", async () => {
    const { backend } = await setup();
    await expect(
      backend.mutation(internal.moderation.disableLink, { slug: "missing" }),
    ).rejects.toThrow('No link uses the slug "missing"');
  });

  test("claiming a disabled guest link does not re-enable it", async () => {
    const { backend, client } = await setup();
    const guestId = crypto.randomUUID();
    const { guestToken } = await createGuestSessionToken(guestId);
    const link = await backend.mutation(api.urlMainFuction.createGuestUrl, {
      url: "https://example.org/guest",
      guestId,
      guestToken,
    });
    await backend.mutation(internal.moderation.disableLink, { slug: link.slug });

    await client.mutation(api.users.store, { guestId, guestToken });
    const claimed = await backend.run((ctx) => ctx.db.get(link.docId));
    expect(claimed?.ownershipState).toBe("user");
    expect(claimed?.disabledAt).toBeTypeOf("number");
    expect((await projection(backend, link.docId)).is_active).toBe(false);
  });
});

describe("blocking a domain", () => {
  test("disables existing links on the domain and its subdomains, including A/B variants", async () => {
    const { backend, userId } = await setup();
    const exact = await insertLink(backend, "exact", "https://evil.example/login");
    const sub = await insertLink(backend, "sub", "https://login.evil.example/x");
    const trailingDot = await insertLink(backend, "dot", "https://evil.example./x");
    const variant = await insertLink(backend, "variant", "https://example.com/ok", {
      userTableId: userId,
      abVariants: [{ url: "https://cdn.evil.example/b", weight: 50 }],
    });
    const lookalike = await insertLink(backend, "lookalike", "https://notevil.example/x");
    const otherTld = await insertLink(backend, "othertld", "https://evil.example.org/x");
    const earlier = await insertLink(backend, "earlier", "https://evil.example/old");
    await backend.mutation(internal.moderation.disableLink, {
      slug: "earlier",
      reason: "Earlier report",
    });

    expect(
      await backend.mutation(internal.moderation.blockDomain, {
        domain: "https://Evil.Example/anything",
        reason: "Phishing campaign",
      }),
    ).toEqual({
      domain: "evil.example",
      alreadyBlocked: false,
      scanned: 7,
      disabled: 4,
      isDone: true,
    });
    for (const urlId of [exact, sub, trailingDot, variant]) {
      const row = await backend.run((ctx) => ctx.db.get(urlId));
      expect(row?.disabledReason).toBe("Blocked domain: evil.example");
      expect((await projection(backend, urlId)).is_active).toBe(false);
    }
    for (const urlId of [lookalike, otherTld]) {
      expect((await projection(backend, urlId)).is_active).toBe(true);
    }
    expect((await backend.run((ctx) => ctx.db.get(earlier)))?.disabledReason).toBe(
      "Earlier report",
    );
    expect(await redirectJob(backend, "sub")).not.toBeNull();
    expect(await redirectJob(backend, "lookalike")).toBeNull();

    await expect(
      backend.mutation(internal.moderation.enableLink, { slug: "exact" }),
    ).rejects.toThrow("blocked domain evil.example");

    expect(
      await backend.mutation(internal.moderation.blockDomain, { domain: "evil.example" }),
    ).toMatchObject({ alreadyBlocked: true, disabled: 0 });
    const blocked = await backend.run((ctx) => ctx.db.query("blocked_domains").collect());
    expect(blocked).toHaveLength(1);
    expect(blocked[0]).toMatchObject({ domain: "evil.example", reason: "Phishing campaign" });
  });

  test("new links cannot use a blocked domain, its subdomains or A/B variants on it", async () => {
    const { backend, client } = await setup();
    await backend.mutation(internal.moderation.blockDomain, { domain: "evil.example" });
    const blockedMessage = "For safety reasons, this domain has been blocked.";

    for (const url of ["https://evil.example/x", "https://a.b.EVIL.example./x"]) {
      await expect(guestCreate(backend, url)).rejects.toThrow(blockedMessage);
      await expect(
        client.mutation(api.urlMainFuction.createUrl, {
          url,
          slugType: "random",
          trackingEnabled: true,
        }),
      ).rejects.toThrow(blockedMessage);
    }
    await expect(
      client.mutation(api.urlMainFuction.createUrl, {
        url: "https://example.com/campaign",
        slugType: "random",
        trackingEnabled: true,
        abEnabled: true,
        abVariants: [{ url: "https://promo.evil.example/b", weight: 50 }],
      }),
    ).rejects.toThrow(blockedMessage);
    await expect(guestCreate(backend, "https://notevil.example/x")).resolves.toBeDefined();

    // Unblocking allows new links again; links disabled by the block stay disabled.
    const disabled = await insertLink(backend, "stays", "https://evil.example/y");
    await backend.mutation(internal.moderation.disableLink, { slug: "stays" });
    expect(
      await backend.mutation(internal.moderation.unblockDomain, { domain: "*.evil.example" }),
    ).toEqual({ domain: "evil.example", removed: true });
    await expect(guestCreate(backend, "https://evil.example/x")).resolves.toBeDefined();
    expect((await projection(backend, disabled)).is_active).toBe(false);
    await backend.mutation(internal.moderation.enableLink, { slug: "stays" });
    expect((await projection(backend, disabled)).is_active).toBe(true);
  });

  test("scans existing links in bounded pages and stops once unblocked", async () => {
    const { backend } = await setup();
    await backend.run(async (ctx) => {
      for (let index = 0; index < 100; index++)
        await ctx.db.insert("urls", {
          fullurl: `https://example.com/${index}`,
          shortUrl: `safe${index}`,
          slugAssigned: `safe${index}`,
          trackingEnabled: true,
        });
    });
    const last = await insertLink(backend, "last", "https://evil.example/late");

    expect(
      await backend.mutation(internal.moderation.blockDomain, { domain: "evil.example" }),
    ).toMatchObject({ scanned: 100, disabled: 0, isDone: false });
    const next = (
      await backend.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())
    ).find((job) => job.name.includes("moderation:disableBlockedDomainLinks"));
    expect(next).toBeDefined();
    const args = next!.args[0] as { domain: string; cursor: string };
    expect(
      await backend.mutation(internal.moderation.disableBlockedDomainLinks, args),
    ).toEqual({ scanned: 1, disabled: 1, isDone: true });
    expect((await projection(backend, last)).is_active).toBe(false);

    await backend.mutation(internal.moderation.unblockDomain, { domain: "evil.example" });
    expect(
      await backend.mutation(internal.moderation.disableBlockedDomainLinks, args),
    ).toEqual({ scanned: 0, disabled: 0, isDone: true });
  });

  test("refuses input that is not a hostname or would block a whole suffix", async () => {
    const { backend } = await setup();
    for (const domain of ["", "com", "http://", "not a host"]) {
      await expect(
        backend.mutation(internal.moderation.blockDomain, { domain }),
      ).rejects.toThrow("Enter a hostname");
    }
  });
});

describe("built-in destination blocklist", () => {
  test("trailing dots and subdomains do not bypass the hardcoded list", () => {
    for (const url of [
      "https://bit.ly/x",
      "https://bit.ly./x",
      "https://www.bit.ly/x",
      "https://ndle.fyi./loop",
    ]) {
      expect(isValidHttpUrl(url).valid).toBe(false);
    }
    expect(isValidHttpUrl("https://localhost./").valid).toBe(false);
    expect(isValidHttpUrl("https://notbit.ly/x").valid).toBe(true);
  });
});

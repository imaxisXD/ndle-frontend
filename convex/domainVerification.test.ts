import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { createTestBackend } from "./test.setup";
import { UNVERIFIED_DOMAIN_TTL_MS } from "./customDomains";

type Backend = ReturnType<typeof createTestBackend>;
const domain = "links.example.test";
const recordName = `_ndle-challenge.${domain}`;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function setup() {
  // Keep queued sync runs (and their Cloudflare calls) from firing on their own.
  vi.useFakeTimers();
  const backend = createTestBackend();
  const [ownerId, rivalId] = await backend.run(async (ctx) => [
    await ctx.db.insert("users", {
      name: "Owner",
      email: "owner@example.test",
      membership: "pro",
      tokenIdentifier: "owner",
    }),
    await ctx.db.insert("users", {
      name: "Rival",
      email: "rival@example.test",
      membership: "free",
      tokenIdentifier: "rival",
    }),
  ]);
  return {
    backend,
    ownerId,
    rivalId,
    owner: backend.withIdentity({ tokenIdentifier: "owner" }),
    rival: backend.withIdentity({ tokenIdentifier: "rival" }),
  };
}

async function tokenOf(backend: Backend, domainId: Id<"custom_domains">) {
  return (await backend.run((ctx) => ctx.db.get(domainId)))!.challengeToken!;
}

/** DNS-over-HTTPS answer carrying the given TXT data, exactly as Cloudflare formats it. */
function dnsAnswer(...data: string[]) {
  return Response.json({
    Status: 0,
    Answer: data.map((value) => ({ name: recordName, type: 16, TTL: 300, data: value })),
  });
}

function stubDns(respond: () => Response | Promise<Response>) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => respond());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function domainJobs(backend: Backend) {
  return backend.run((ctx) =>
    ctx.db
      .query("serviceSyncJobs")
      .withIndex("by_key", (q) => q.eq("key", `domain:${domain}`))
      .collect(),
  );
}

describe("adding a custom domain", () => {
  test("creates an unverified challenge without claiming the hostname or calling Cloudflare", async () => {
    const { backend, owner, rival } = await setup();
    const fetchMock = stubDns(() => new Response(null, { status: 500 }));
    const mine = await owner.mutation(api.customDomains.addDomain, {
      domain: "https://Links.Example.test/path",
    });
    expect(mine.success).toBe(true);
    const row = await backend.run((ctx) => ctx.db.get(mine.domainId!));
    expect(row).toMatchObject({ domain, status: "awaiting_verification" });
    expect(row?.challengeToken).toMatch(/^[0-9a-f]{32}$/);
    expect(await domainJobs(backend)).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();

    const [listed] = await owner.query(api.customDomains.listUserDomains, {});
    expect(listed).toMatchObject({
      status: "awaiting_verification",
      challengeRecordName: recordName,
      challengeRecordValue: `ndle-verify=${row!.challengeToken}`,
      challengeExpiresAt: row!._creationTime + UNVERIFIED_DOMAIN_TTL_MS,
    });

    // Not exclusive: another account may try to prove the same hostname.
    const theirs = await rival.mutation(api.customDomains.addDomain, { domain });
    expect(theirs.success).toBe(true);
    expect(theirs.domainId).not.toBe(mine.domainId);
    expect(await tokenOf(backend, theirs.domainId!)).not.toBe(row!.challengeToken);
    // Adding again returns the account's own attempt.
    expect(await owner.mutation(api.customDomains.addDomain, { domain })).toEqual(mine);

    // An unverified domain cannot serve links.
    await expect(
      owner.mutation(api.urlMainFuction.createUrl, {
        url: "https://example.com/x",
        slugType: "random",
        trackingEnabled: true,
        customDomain: domain,
      }),
    ).rejects.toThrow("Custom domain is not active for this account.");
  });

  test("each account can only hold a few unverified domains", async () => {
    const { owner } = await setup();
    for (const host of ["a.example.test", "b.example.test", "c.example.test"]) {
      expect((await owner.mutation(api.customDomains.addDomain, { domain: host })).success).toBe(
        true,
      );
    }
    expect(await owner.mutation(api.customDomains.addDomain, { domain: "d.example.test" })).toEqual({
      success: false,
      error: "You can have up to 3 domains waiting for verification. Verify or remove one first.",
    });
  });

  test("deleting an unverified domain touches neither Cloudflare nor links", async () => {
    const { backend, owner } = await setup();
    const created = await owner.mutation(api.customDomains.addDomain, { domain });
    expect(
      await owner.mutation(api.customDomains.deleteDomain, { domainId: created.domainId! }),
    ).toEqual({ success: true });
    expect(await backend.run((ctx) => ctx.db.get(created.domainId!))).toBeNull();
    expect(await domainJobs(backend)).toHaveLength(0);
  });
});

describe("verifying a custom domain", () => {
  test("accepts only the exact challenge value, then claims the hostname and starts Cloudflare", async () => {
    const { backend, owner, rival, ownerId } = await setup();
    const created = await owner.mutation(api.customDomains.addDomain, { domain });
    const rivalAttempt = await rival.mutation(api.customDomains.addDomain, { domain });
    const token = await tokenOf(backend, created.domainId!);

    let answer = dnsAnswer(
      '"ndle-verify=0000"',
      `"ndle-verify=${token}x"`,
      `"NDLE-VERIFY=${token}"`,
      `"prefix ndle-verify=${token}"`,
    );
    const fetchMock = stubDns(() => answer);
    const miss = await owner.action(api.customDomains.verifyDomain, {
      domainId: created.domainId!,
    });
    expect(miss.success).toBe(false);
    expect(miss.error).toContain("couldn't find the verification TXT record");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(recordName)}&type=TXT`,
    );
    expect(init?.headers).toEqual({ accept: "application/dns-json" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect((await backend.run((ctx) => ctx.db.get(created.domainId!)))?.status).toBe(
      "awaiting_verification",
    );

    // Long TXT values arrive as several quoted strings that join into one record.
    vi.advanceTimersByTime(10_000);
    answer = dnsAnswer('"v=spf1 -all"', `"ndle-verify=" "${token}"`);
    expect(
      await owner.action(api.customDomains.verifyDomain, { domainId: created.domainId! }),
    ).toEqual({ success: true });
    const claimed = await backend.run((ctx) => ctx.db.get(created.domainId!));
    expect(claimed).toMatchObject({ status: "pending", userId: ownerId });
    expect(claimed?.ownershipVerifiedAt).toBeTypeOf("number");
    // From here the existing flow runs: a durable job registers it with Cloudflare.
    const [job] = await domainJobs(backend);
    expect(job).toMatchObject({
      status: "pending",
      target: { kind: "domain", hostname: domain, domainId: created.domainId },
    });

    // The rival's attempt is gone, and the hostname is now exclusive.
    expect(await backend.run((ctx) => ctx.db.get(rivalAttempt.domainId!))).toBeNull();
    expect(await rival.mutation(api.customDomains.addDomain, { domain })).toEqual({
      success: false,
      error: "This domain is already registered",
    });
  });

  test("checks DNS at most once every 10 seconds per record", async () => {
    const { backend, owner } = await setup();
    const created = await owner.mutation(api.customDomains.addDomain, { domain });
    const fetchMock = stubDns(() => dnsAnswer('"unrelated"'));
    await owner.action(api.customDomains.verifyDomain, { domainId: created.domainId! });
    vi.advanceTimersByTime(9_000);
    expect(
      await owner.action(api.customDomains.verifyDomain, { domainId: created.domainId! }),
    ).toEqual({ success: false, error: "Please wait a few seconds before checking again." });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    await owner.action(api.customDomains.verifyDomain, { domainId: created.domainId! });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(
      (await backend.run((ctx) => ctx.db.get(created.domainId!)))?.lastVerificationAttemptAt,
    ).toBe(Date.now());
  });

  test("DNS failures and missing records never claim the hostname", async () => {
    const { backend, owner } = await setup();
    const created = await owner.mutation(api.customDomains.addDomain, { domain });
    const cases: Array<[() => Response | Promise<Response>, string]> = [
      [() => Response.json({ Status: 3 }), "couldn't find the verification TXT record"],
      [() => Response.json({ Status: 2 }), "couldn't check your DNS"],
      [() => new Response("busy", { status: 503 }), "couldn't check your DNS"],
      [() => Response.json({ unexpected: true }), "couldn't check your DNS"],
      [
        () => {
          throw new Error("network down");
        },
        "couldn't check your DNS",
      ],
    ];
    for (const [respond, error] of cases) {
      stubDns(respond);
      const result = await owner.action(api.customDomains.verifyDomain, {
        domainId: created.domainId!,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain(error);
      vi.advanceTimersByTime(10_000);
    }
    expect((await backend.run((ctx) => ctx.db.get(created.domainId!)))?.status).toBe(
      "awaiting_verification",
    );
    expect(await domainJobs(backend)).toHaveLength(0);
  });

  test("only the owner can verify, and another account's claim wins", async () => {
    const { backend, owner, rival, rivalId } = await setup();
    const created = await owner.mutation(api.customDomains.addDomain, { domain });
    const token = await tokenOf(backend, created.domainId!);
    stubDns(() => dnsAnswer(`"ndle-verify=${token}"`));
    expect(
      await rival.action(api.customDomains.verifyDomain, { domainId: created.domainId! }),
    ).toEqual({ success: false, error: "Not authorized" });

    // A rival already holds the hostname (e.g. verified while this check was in flight).
    await backend.run((ctx) =>
      ctx.db.insert("custom_domains", {
        userId: rivalId,
        domain,
        status: "pending",
        createdAt: Date.now(),
      }),
    );
    expect(
      await owner.action(api.customDomains.verifyDomain, { domainId: created.domainId! }),
    ).toEqual({ success: false, error: "Another account has already verified this domain." });
    expect((await backend.run((ctx) => ctx.db.get(created.domainId!)))?.status).toBe(
      "awaiting_verification",
    );
  });

  test("other accounts' attempts are removed in bounded pages", async () => {
    const { backend, owner } = await setup();
    await backend.run(async (ctx) => {
      for (let index = 0; index < 101; index++) {
        const userId = await ctx.db.insert("users", {
          name: `Squatter ${index}`,
          email: `squatter${index}@example.test`,
          membership: "free",
          tokenIdentifier: `squatter-${index}`,
        });
        await ctx.db.insert("custom_domains", {
          userId,
          domain,
          status: "awaiting_verification",
          challengeToken: `${index}`.padStart(32, "0"),
          createdAt: Date.now(),
        });
      }
    });
    const created = await owner.mutation(api.customDomains.addDomain, { domain });
    expect(
      await owner.mutation(internal.customDomains.completeDomainVerification, {
        domainId: created.domainId!,
        challengeToken: await tokenOf(backend, created.domainId!),
      }),
    ).toEqual({ success: true });
    const remaining = () =>
      backend.run(async (ctx) =>
        (
          await ctx.db
            .query("custom_domains")
            .withIndex("by_domain_and_status", (q) =>
              q.eq("domain", domain).eq("status", "awaiting_verification"),
            )
            .collect()
        ).length,
      );
    expect(await remaining()).toBe(1);
    const next = (
      await backend.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())
    ).find((job) => job.name.includes("customDomains:removeUnverifiedDomains"));
    await backend.mutation(
      internal.customDomains.removeUnverifiedDomains,
      next!.args[0] as { hostname: string },
    );
    expect(await remaining()).toBe(0);
  });
});

describe("unverified domain expiry", () => {
  test("removes attempts older than 7 days in bounded pages and leaves claimed rows alone", async () => {
    const { backend, owner, ownerId } = await setup();
    const staleIds: Array<Id<"custom_domains">> = [];
    const legacyIds = await backend.run(async (ctx) => {
      for (let index = 0; index < 102; index++)
        staleIds.push(
          await ctx.db.insert("custom_domains", {
            userId: ownerId,
            domain: `old-${index}.example.test`,
            status: "awaiting_verification",
            challengeToken: `${index}`.padStart(32, "0"),
            createdAt: Date.now(),
          }),
        );
      // Grandfathered rows from before verification existed never expire.
      return Promise.all(
        (["pending", "active", "failed"] as const).map((status) =>
          ctx.db.insert("custom_domains", {
            userId: ownerId,
            domain: `${status}.example.test`,
            status,
            createdAt: Date.now(),
          }),
        ),
      );
    });
    vi.advanceTimersByTime(UNVERIFIED_DOMAIN_TTL_MS + 1);

    // Past its lifetime, a row cannot be verified even before cleanup runs.
    const fetchMock = stubDns(() => dnsAnswer(`"ndle-verify=${"0".repeat(32)}"`));
    expect(
      await owner.action(api.customDomains.verifyDomain, { domainId: staleIds[0] }),
    ).toEqual({
      success: false,
      error: "This verification expired. Remove the domain and add it again.",
    });
    expect(fetchMock).not.toHaveBeenCalled();

    const fresh = await backend.run((ctx) =>
      ctx.db.insert("custom_domains", {
        userId: ownerId,
        domain: "fresh.example.test",
        status: "awaiting_verification",
        challengeToken: "f".repeat(32),
        createdAt: Date.now(),
      }),
    );
    expect(await backend.mutation(internal.customDomains.expireUnverifiedDomains, {})).toBe(100);
    const next = (
      await backend.run((ctx) => ctx.db.system.query("_scheduled_functions").collect())
    ).find((job) => job.name.includes("customDomains:expireUnverifiedDomains"));
    expect(next).toBeDefined();
    expect(await backend.mutation(internal.customDomains.expireUnverifiedDomains, {})).toBe(2);
    const left = await backend.run((ctx) => ctx.db.query("custom_domains").collect());
    expect(left.map((row) => row._id).sort()).toEqual([...legacyIds, fresh].sort());
  });
});

describe("grandfathered custom domains", () => {
  test("rows already past verification keep today's flow", async () => {
    const { backend, owner, ownerId, rival } = await setup();
    const [pendingId, activeId] = await backend.run(async (ctx) => [
      await ctx.db.insert("custom_domains", {
        userId: ownerId,
        domain,
        status: "pending",
        cloudflareHostnameId: "cf-id",
        createdAt: Date.now() - 30 * 86_400_000,
      }),
      await ctx.db.insert("custom_domains", {
        userId: ownerId,
        domain: "go.example.test",
        status: "active",
        createdAt: Date.now() - 30 * 86_400_000,
      }),
    ]);
    const fetchMock = stubDns(() => new Response(null, { status: 500 }));

    // "Verify" on a pending row re-checks Cloudflare as before; no DNS challenge.
    expect(
      await owner.action(api.customDomains.verifyDomain, { domainId: pendingId }),
    ).toEqual({ success: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await domainJobs(backend)).toMatchObject([
      { target: { kind: "domain", hostname: domain, domainId: pendingId, hostnameId: "cf-id" } },
    ]);
    const listed = await owner.query(api.customDomains.listUserDomains, {});
    expect(listed.every((row) => row.challengeRecordName === undefined)).toBe(true);

    // Claimed rows stay exclusive and usable.
    expect(await rival.mutation(api.customDomains.addDomain, { domain })).toEqual({
      success: false,
      error: "This domain is already registered",
    });
    expect(await owner.mutation(api.customDomains.addDomain, { domain })).toEqual({
      success: true,
      domainId: pendingId,
    });
    await expect(
      owner.mutation(api.urlMainFuction.createUrl, {
        url: "https://example.com/branded",
        slugType: "random",
        trackingEnabled: true,
        customDomain: "go.example.test",
      }),
    ).resolves.toBeDefined();
    expect(activeId).toBeDefined();
  });

  test("Cloudflare sync ignores unverified rows", async () => {
    const { backend, owner, rival } = await setup();
    const attempt = await rival.mutation(api.customDomains.addDomain, { domain });
    expect(
      await backend.query(internal.domainSync.getDesiredDomain, { hostname: domain }),
    ).toBeNull();
    expect(await backend.mutation(internal.domainSync.bootstrapDomains, { cursor: null })).toBe(1);
    expect(await domainJobs(backend)).toHaveLength(0);
    // A late Cloudflare result is never attached to an unverified row.
    expect(
      await backend.mutation(internal.domainSync.saveDomainStatus, {
        domainId: attempt.domainId!,
        hostname: domain,
        hostnameId: "cf-id",
        status: "active",
        sslStatus: "active",
      }),
    ).toBe(false);

    // Several unverified rows for one hostname do not break the claimed lookup.
    const mine = await owner.mutation(api.customDomains.addDomain, { domain });
    await owner.mutation(internal.customDomains.completeDomainVerification, {
      domainId: mine.domainId!,
      challengeToken: await tokenOf(backend, mine.domainId!),
    });
    expect(
      await backend.query(internal.domainSync.getDesiredDomain, { hostname: domain }),
    ).toMatchObject({ _id: mine.domainId, status: "pending" });
  });
});

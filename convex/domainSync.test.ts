import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { createTestBackend } from "./test.setup";

type Backend = ReturnType<typeof createTestBackend>;
const domain = "links.example.test";
const hostname = {
  id: "cloudflare-hostname",
  hostname: domain,
  status: "active",
  ssl: { status: "active" },
};
const response = (result: unknown) => Response.json({ success: true, result });

async function setup() {
  vi.stubEnv("CLOUDFLARE_API_TOKEN", "test-only");
  vi.stubEnv("CLOUDFLARE_ZONE_ID", "test-zone");
  const backend = createTestBackend();
  const identity = { tokenIdentifier: "domain-owner" };
  const userId = await backend.run((ctx) =>
    ctx.db.insert("users", {
      name: "Domain owner",
      email: "domain@example.test",
      membership: "pro",
      tokenIdentifier: identity.tokenIdentifier,
    }),
  );
  return { backend, client: backend.withIdentity(identity), userId };
}

async function jobFor(backend: Backend, key = `domain:${domain}`) {
  const job = await backend.run((ctx) =>
    ctx.db
      .query("serviceSyncJobs")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique(),
  );
  if (!job) throw new Error("Expected a saved domain job");
  return job;
}

async function runJob(backend: Backend, key = `domain:${domain}`) {
  const job = await jobFor(backend, key);
  await backend.action(internal.serviceSync.run, {
    jobId: job._id,
    version: job.version,
  });
  return jobFor(backend, key);
}

async function makeJobDue(backend: Backend, key = `domain:${domain}`) {
  const job = await jobFor(backend, key);
  await backend.run((ctx) => ctx.db.patch(job._id, { nextAttemptAt: 0 }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("durable custom domain changes", () => {
  test("saves registration and deletion work even before a Cloudflare ID exists", async () => {
    const { backend, client } = await setup();
    const created = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    expect(created.success).toBe(true);
    const registration = await jobFor(backend);
    expect(registration.target).toMatchObject({
      kind: "domain",
      hostname: domain,
      domainId: created.domainId,
    });
    await client.mutation(api.customDomains.deleteDomain, {
      domainId: created.domainId!,
    });
    const deletion = await jobFor(backend);
    expect(deletion.version).toBeGreaterThan(registration.version);
    expect(deletion.target).toMatchObject({ hostname: domain });
    expect(
      await backend.run((ctx) => ctx.db.get(created.domainId!)),
    ).toBeNull();
  });

  test("retries a lost create response by finding the existing hostname before creating again", async () => {
    const { backend, client } = await setup();
    const created = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    let createdInCloudflare = false;
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        createdInCloudflare = true;
        throw new Error(
          "Response was lost after Cloudflare created the hostname",
        );
      }
      expect(new URL(url).searchParams.get("hostname.exact")).toBe(domain);
      return response(createdInCloudflare ? [hostname] : []);
    });
    vi.stubGlobal("fetch", fetchMock);
    const failed = await runJob(backend);
    expect(failed.status).toBe("pending");
    expect(failed.lastError).toContain("Response was lost");
    await makeJobDue(backend);
    expect((await runJob(backend)).status).toBe("complete");
    expect(
      fetchMock.mock.calls.filter(([, options]) => options?.method === "POST"),
    ).toHaveLength(1);
    expect(
      await backend.run((ctx) => ctx.db.get(created.domainId!)),
    ).toMatchObject({ status: "active", cloudflareHostnameId: hostname.id });
  });

  test("deletion during registration removes an orphan whose ID was never saved", async () => {
    const { backend, client } = await setup();
    const created = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    let exists = false;
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        exists = true;
        await client.mutation(api.customDomains.deleteDomain, {
          domainId: created.domainId!,
        });
        return response(hostname);
      }
      if (options?.method === "DELETE") {
        exists = false;
        return response({ id: hostname.id });
      }
      return response(exists ? [hostname] : []);
    });
    vi.stubGlobal("fetch", fetchMock);
    expect((await runJob(backend)).status).toBe("pending");
    expect((await jobFor(backend)).target).not.toHaveProperty("hostnameId");
    expect((await runJob(backend)).status).toBe("complete");
    expect(exists).toBe(false);
    expect(
      fetchMock.mock.calls.filter(
        ([, options]) => options?.method === "DELETE",
      ),
    ).toHaveLength(1);
  });

  test("an old deletion preserves a newer registration of the same hostname", async () => {
    const { backend, client } = await setup();
    const first = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    await backend.run((ctx) =>
      ctx.db.patch(first.domainId!, { cloudflareHostnameId: hostname.id }),
    );
    await client.mutation(api.customDomains.deleteDomain, {
      domainId: first.domainId!,
    });
    const replacement = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    const fetchMock = vi.fn(async () => response([hostname]));
    vi.stubGlobal("fetch", fetchMock);
    expect((await runJob(backend)).status).toBe("complete");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(
      await backend.run((ctx) => ctx.db.get(replacement.domainId!)),
    ).toMatchObject({ status: "active", cloudflareHostnameId: hostname.id });
  });

  test("a replacement waits for an in-flight deletion and then restores the hostname", async () => {
    const { backend, client } = await setup();
    const first = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    await backend.run((ctx) =>
      ctx.db.patch(first.domainId!, { cloudflareHostnameId: hostname.id }),
    );
    await client.mutation(api.customDomains.deleteDomain, {
      domainId: first.domainId!,
    });
    let beginDelete!: () => void;
    let finishDelete!: () => void;
    const deleteStarted = new Promise<void>((resolve) => {
      beginDelete = resolve;
    });
    const deleteMayFinish = new Promise<void>((resolve) => {
      finishDelete = resolve;
    });
    let exists = true;
    const fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
      if (options?.method === "DELETE") {
        beginDelete();
        await deleteMayFinish;
        exists = false;
        return response({ id: hostname.id });
      }
      if (options?.method === "POST") {
        exists = true;
        return response(hostname);
      }
      return response(
        new URL(url).search ? (exists ? [hostname] : []) : hostname,
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const deleting = runJob(backend);
    await deleteStarted;
    const replacement = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    expect((await runJob(backend)).status).toBe("running");
    expect(
      fetchMock.mock.calls.some(([, options]) => options?.method === "POST"),
    ).toBe(false);
    finishDelete();
    expect((await deleting).status).toBe("pending");
    expect((await runJob(backend)).status).toBe("complete");
    expect(exists).toBe(true);
    expect(
      await backend.run((ctx) => ctx.db.get(replacement.domainId!)),
    ).toMatchObject({ status: "active" });
  });

  test("deletion retries service errors and treats a missing hostname as already deleted", async () => {
    const { backend, client } = await setup();
    const created = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    await backend.run((ctx) =>
      ctx.db.patch(created.domainId!, { cloudflareHostnameId: hostname.id }),
    );
    await client.mutation(api.customDomains.deleteDomain, {
      domainId: created.domainId!,
    });
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, options?: RequestInit) =>
        options?.method === "DELETE"
          ? new Response(null, { status: fail ? 503 : 404 })
          : response(hostname),
      ),
    );
    expect((await runJob(backend)).lastError).toContain("HTTP 503");
    fail = false;
    await makeJobDue(backend);
    expect((await runJob(backend)).status).toBe("complete");
  });

  test("legacy deletion saves ID lookup work before any network request and joins the hostname queue", async () => {
    const { backend, client } = await setup();
    const created = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    const fetchMock = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await backend.action(internal.customDomains.internalDeleteFromCloudflare, {
      cloudflareHostnameId: hostname.id,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const key = `domain-id:${hostname.id}`;
    expect((await runJob(backend, key)).status).toBe("pending");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        response(new URL(url).search ? [hostname] : hostname),
      ),
    );
    await makeJobDue(backend, key);
    expect((await runJob(backend, key)).status).toBe("complete");
    expect((await runJob(backend)).status).toBe("complete");
    expect(
      await backend.run((ctx) => ctx.db.get(created.domainId!)),
    ).toMatchObject({ status: "active" });
  });

  test("a legacy registration finishing after deletion saves a cleanup lookup", async () => {
    const { backend, client } = await setup();
    const created = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    await client.mutation(api.customDomains.deleteDomain, {
      domainId: created.domainId!,
    });
    await backend.mutation(internal.customDomains.internalUpdateDomain, {
      domainId: created.domainId!,
      status: "pending",
      cloudflareHostnameId: hostname.id,
    });
    expect((await jobFor(backend, `domain-id:${hostname.id}`)).target).toEqual({
      kind: "domain_lookup",
      hostnameId: hostname.id,
    });
  });

  test("status polling covers domains missing an ID without resetting failed job backoff", async () => {
    const { backend, userId } = await setup();
    await backend.run(async (ctx) => {
      for (let index = 0; index < 51; index++)
        await ctx.db.insert("custom_domains", {
          domain: `links-${index}.example.test`,
          userId,
          status: "pending",
          createdAt: Date.now(),
        });
      await ctx.db.insert("serviceSyncJobs", {
        key: "domain:links-0.example.test",
        target: { kind: "domain", hostname: "links-0.example.test" },
        version: 1,
        status: "pending",
        attempts: 7,
        nextAttemptAt: Date.now() + 60_000,
        updatedAt: Date.now(),
      });
    });
    const before = await jobFor(backend, "domain:links-0.example.test");
    expect(
      await backend.mutation(internal.domainSync.queuePendingDomainPage, {
        cursor: null,
      }),
    ).toBe(50);
    expect(await jobFor(backend, before.key)).toEqual(before);
    const stored = await backend.run(async (ctx) => ({
      jobs: await ctx.db.query("serviceSyncJobs").collect(),
      scheduled: await ctx.db.system.query("_scheduled_functions").collect(),
    }));
    expect(stored.jobs).toHaveLength(50);
    const nextPage = stored.scheduled.find((item) =>
      item.name.includes("domainSync:queuePendingDomainPage"),
    );
    expect(nextPage).toBeDefined();
    const args = nextPage!.args[0] as { cursor: string };
    expect(
      await backend.mutation(internal.domainSync.queuePendingDomainPage, args),
    ).toBe(1);
    expect(
      await backend.run((ctx) => ctx.db.query("serviceSyncJobs").collect()),
    ).toHaveLength(51);
  });

  test("active certificates alone do not mark an unverified hostname active", async () => {
    const { backend, client } = await setup();
    const created = await client.mutation(api.customDomains.addDomain, {
      domain,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response([{ ...hostname, status: "pending" }])),
    );
    expect((await runJob(backend)).status).toBe("complete");
    expect(
      await backend.run((ctx) => ctx.db.get(created.domainId!)),
    ).toMatchObject({ status: "pending", sslStatus: "active" });
  });

  test("bootstrap adopts existing active and failed domains in bounded pages without replacing jobs", async () => {
    const { backend, userId } = await setup();
    await backend.run(async (ctx) => {
      for (let index = 0; index < 51; index++)
        await ctx.db.insert("custom_domains", {
          domain: `old-${index}.example.test`,
          userId,
          status: index % 2 ? "active" : "failed",
          createdAt: Date.now(),
          cloudflareHostnameId: `old-id-${index}`,
        });
    });
    expect(
      await backend.mutation(internal.domainSync.bootstrapDomains, {
        cursor: null,
      }),
    ).toBe(50);
    const before = await backend.run((ctx) =>
      ctx.db.query("serviceSyncJobs").collect(),
    );
    expect(before).toHaveLength(50);
    expect(before[0].target).toMatchObject({
      kind: "domain",
      hostnameId: "old-id-0",
    });
    await backend.mutation(internal.domainSync.bootstrapDomains, {
      cursor: null,
    });
    expect(
      await backend.run((ctx) => ctx.db.query("serviceSyncJobs").collect()),
    ).toEqual(before);
    const nextPage = await backend.run(async (ctx) =>
      (await ctx.db.system.query("_scheduled_functions").collect()).find(
        (item) => item.name.includes("domainSync:bootstrapDomains"),
      ),
    );
    expect(nextPage).toBeDefined();
    expect(
      await backend.mutation(
        internal.domainSync.bootstrapDomains,
        nextPage!.args[0] as { cursor: string },
      ),
    ).toBe(1);
    expect(
      await backend.run((ctx) => ctx.db.query("serviceSyncJobs").collect()),
    ).toHaveLength(51);
  });

  test.each([
    { result: null, error: "invalid domain list" },
    {
      result: [{ ...hostname, hostname: "unrelated.example.test" }],
      error: "different domain",
    },
  ])(
    "invalid successful responses remain retryable: $error",
    async ({ result, error }) => {
      const { backend, client } = await setup();
      await client.mutation(api.customDomains.addDomain, { domain });
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => response(result)),
      );
      const failed = await runJob(backend);
      expect(failed.status).toBe("pending");
      expect(failed.lastError).toContain(error);
    },
  );

  test("missing credentials remain visible retryable work", async () => {
    const { backend, client } = await setup();
    await client.mutation(api.customDomains.addDomain, { domain });
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "");
    const failed = await runJob(backend);
    expect(failed.status).toBe("pending");
    expect(failed.lastError).toContain("credentials are not configured");
  });

  test("another account cannot adopt a domain just because its local status is old", async () => {
    const { backend, client } = await setup();
    await backend.run(async (ctx) => {
      const otherUserId = await ctx.db.insert("users", {
        name: "Other owner",
        email: "other@example.test",
        membership: "pro",
        tokenIdentifier: "other-domain-owner",
      });
      await ctx.db.insert("custom_domains", {
        domain,
        userId: otherUserId,
        status: "pending",
        createdAt: Date.now() - 3 * 86_400_000,
      });
    });
    expect(
      await client.mutation(api.customDomains.addDomain, { domain }),
    ).toEqual({ success: false, error: "This domain is already registered" });
  });
});

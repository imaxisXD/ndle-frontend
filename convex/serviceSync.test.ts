import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { createTestBackend } from "./test.setup";
import { queueServiceSync } from "./serviceSync";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
async function setup() {
  const backend = createTestBackend();
  const userId = await backend.run((ctx) =>
    ctx.db.insert("users", {
      name: "Test",
      email: "test@example.test",
      membership: "free",
      tokenIdentifier: "account",
    }),
  );
  return { backend, userId };
}

describe("saved service updates", () => {
  test("failed delivery stays pending and only successful Clerk delivery confirms metadata", async () => {
    const { backend, userId } = await setup();
    vi.stubEnv("CLERK_SECRET_KEY", "local-only");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("retry", { status: 503 })),
    );
    const version = await backend.run((ctx) =>
      queueServiceSync(ctx, `clerk:${userId}`, {
        kind: "clerk",
        userId,
        clerkUserId: "user_test",
      }),
    );
    const job = await backend.run((ctx) =>
      ctx.db.query("serviceSyncJobs").first(),
    );
    await backend.action(internal.serviceSync.run, {
      jobId: job!._id,
      version,
    });
    const failed = await backend.run((ctx) => ctx.db.get(job!._id));
    expect(failed?.status).toBe("pending");
    expect(failed?.attempts).toBe(1);
    expect(failed?.lastError).toContain("503");
    expect(
      (await backend.run((ctx) => ctx.db.get(userId)))?.metadataSyncedAt,
    ).toBeUndefined();
    await backend.run((ctx) => ctx.db.patch(job!._id, { nextAttemptAt: 0 }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          id: "user_test",
          public_metadata: {
            convex_user_id: userId,
            membership: "free",
            plan: "free",
          },
        }),
      ),
    );
    await backend.action(internal.serviceSync.run, {
      jobId: job!._id,
      version,
    });
    expect((await backend.run((ctx) => ctx.db.get(job!._id)))?.status).toBe(
      "complete",
    );
    expect(
      (await backend.run((ctx) => ctx.db.get(userId)))?.metadataSyncedAt,
    ).toBeTypeOf("number");
  });

  test("a newer update waits for the running version and cannot be marked complete by it", async () => {
    const { backend, userId } = await setup();
    const version = await backend.run((ctx) =>
      queueServiceSync(ctx, `owner:${userId}`, {
        kind: "owner",
        userId,
        ownerKeys: ["guest:first"],
      }),
    );
    const job = await backend.run((ctx) =>
      ctx.db.query("serviceSyncJobs").first(),
    );
    expect(
      await backend.mutation(internal.serviceSync.claim, {
        jobId: job!._id,
        version,
      }),
    ).not.toBeNull();
    const nextVersion = await backend.run((ctx) =>
      queueServiceSync(ctx, `owner:${userId}`, {
        kind: "owner",
        userId,
        ownerKeys: ["guest:second"],
      }),
    );
    expect(nextVersion).toBeGreaterThan(version);
    expect(
      await backend.mutation(internal.serviceSync.claim, {
        jobId: job!._id,
        version: nextVersion,
      }),
    ).toBeNull();
    await backend.mutation(internal.serviceSync.finish, {
      jobId: job!._id,
      version,
    });
    const saved = await backend.run((ctx) => ctx.db.get(job!._id));
    expect(saved?.status).toBe("pending");
    expect(saved?.target).toMatchObject({
      ownerKeys: ["guest:first", "guest:second"],
    });
    expect(
      await backend.mutation(internal.serviceSync.claim, {
        jobId: job!._id,
        version: nextVersion,
      }),
    ).not.toBeNull();
  });

  test.each(["empty", "wrong user", "wrong metadata", "HTML"])(
    "Clerk rejects a malformed successful response: %s",
    async (shape) => {
      const { backend, userId } = await setup();
      vi.stubEnv("CLERK_SECRET_KEY", "local-only");
      const body =
        shape === "empty"
          ? {}
          : {
              id: shape === "wrong user" ? "user_someone_else" : "user_test",
              public_metadata: {
                convex_user_id:
                  shape === "wrong metadata" ? "different-account" : userId,
                membership: "free",
                plan: "free",
              },
            };
      vi.stubGlobal(
        "fetch",
        vi.fn(async () =>
          shape === "HTML"
            ? new Response("<html>Sign in</html>")
            : Response.json(body),
        ),
      );
      const version = await backend.run((ctx) =>
        queueServiceSync(ctx, `clerk:${userId}`, {
          kind: "clerk",
          userId,
          clerkUserId: "user_test",
        }),
      );
      const job = await backend.run((ctx) =>
        ctx.db.query("serviceSyncJobs").first(),
      );
      await backend.action(internal.serviceSync.run, {
        jobId: job!._id,
        version,
      });
      expect((await backend.run((ctx) => ctx.db.get(job!._id)))?.status).toBe(
        "pending",
      );
      expect(
        (await backend.run((ctx) => ctx.db.get(userId)))?.metadataSyncedAt,
      ).toBeUndefined();
    },
  );

  test.each([
    { body: {}, status: 200 },
    { body: { success: false }, status: 200 },
    { body: { success: true }, status: 202 },
  ])(
    "owner updates require a completed positive acknowledgement: $body / $status",
    async ({ body, status }) => {
      const { backend, userId } = await setup();
      vi.stubEnv("INTERNAL_API_URL", "https://analytics.test/analytics/v2");
      vi.stubEnv("API_SECRET", "local-only");
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json(body, { status })),
      );
      const version = await backend.run((ctx) =>
        queueServiceSync(ctx, `owner:${userId}`, {
          kind: "owner",
          userId,
          ownerKeys: [userId],
        }),
      );
      const job = await backend.run((ctx) =>
        ctx.db.query("serviceSyncJobs").first(),
      );
      await backend.action(internal.serviceSync.run, {
        jobId: job!._id,
        version,
      });
      expect((await backend.run((ctx) => ctx.db.get(job!._id)))?.status).toBe(
        "pending",
      );
      await backend.run((ctx) => ctx.db.patch(job!._id, { nextAttemptAt: 0 }));
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({ success: true })),
      );
      await backend.action(internal.serviceSync.run, {
        jobId: job!._id,
        version,
      });
      expect((await backend.run((ctx) => ctx.db.get(job!._id)))?.status).toBe(
        "complete",
      );
    },
  );

  test("a late legacy registration writes the current owner of a reused slug and confirms that link", async () => {
    vi.useFakeTimers();
    const { backend, userId } = await setup();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "local-only");
    const client = backend.withIdentity({ tokenIdentifier: "account" });
    const old = await client.mutation(api.urlMainFuction.createUrl, {
      url: "https://example.com/old",
      slugType: "random",
      trackingEnabled: true,
    });
    await client.mutation(api.urlMainFuction.deleteUrl, { urlSlug: old.slug });
    const replacementId = await backend.run(async (ctx) => {
      const id = await ctx.db.insert("urls", {
        fullurl: "https://example.com/replacement",
        shortUrl: old.slug,
        slugAssigned: old.slug,
        userTableId: userId,
        trackingEnabled: true,
      });
      await queueServiceSync(ctx, `redirect:${old.slug}`, {
        kind: "redirect",
        slug: old.slug,
        urlId: id,
      });
      return id;
    });
    await backend.action(internal.redisAction.insertIntoRedis, {
      fullUrl: "https://example.com/old",
      slugAssigned: old.slug,
      docId: old.docId,
      analytics_owner_key: `user:${userId}`,
      convex_user_id: userId,
      trackingEnabled: true,
    });
    const job = await backend.run((ctx) =>
      ctx.db
        .query("serviceSyncJobs")
        .withIndex("by_key", (q) => q.eq("key", `redirect:${old.slug}`))
        .unique(),
    );
    expect(job?.target).toMatchObject({ urlId: old.docId });
    const fetchMock = vi.fn(async (_url: string, options?: RequestInit) => {
      const command = JSON.parse(String(options?.body));
      return Response.json(
        Array.isArray(command[0]) ? [{ result: 1 }] : { result: 1 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    await backend.action(internal.serviceSync.run, {
      jobId: job!._id,
      version: job!.version,
    });
    expect(
      (await backend.run((ctx) => ctx.db.get(job!._id)))?.lastError,
    ).toBeUndefined();
    expect(await backend.run((ctx) => ctx.db.get(job!._id))).toMatchObject({
      status: "complete",
    });
    const request = vi.mocked(fetch).mock.calls[0][1];
    const sent = JSON.parse(String(request?.body));
    const command = (Array.isArray(sent[0]) ? sent[0] : sent) as string[];
    expect(JSON.parse(command[command.length - 1])).toMatchObject({
      link_id: replacementId,
      destination: "https://example.com/replacement",
    });
    expect(await backend.run((ctx) => ctx.db.get(replacementId))).toMatchObject(
      { redisStatus: "OK", urlStatusMessage: "success" },
    );
    expect(await backend.run((ctx) => ctx.db.get(job!._id))).toMatchObject({
      status: "complete",
      target: { urlId: replacementId },
    });
  });

  test("creation and deletion save desired state atomically and retries read the deletion", async () => {
    const { backend } = await setup();
    const client = backend.withIdentity({ tokenIdentifier: "account" });
    const created = await client.mutation(api.urlMainFuction.createUrl, {
      url: "https://example.com/test",
      slugType: "random",
      trackingEnabled: true,
    });
    const before = await backend.run((ctx) =>
      ctx.db
        .query("serviceSyncJobs")
        .withIndex("by_key", (q) => q.eq("key", `redirect:${created.slug}`))
        .unique(),
    );
    expect(before).not.toBeNull();
    await client.mutation(api.urlMainFuction.deleteUrl, {
      urlSlug: created.slug,
    });
    const after = await backend.run((ctx) => ctx.db.get(before!._id));
    expect(after!.version).toBeGreaterThan(before!.version);
    expect(
      await backend.mutation(internal.serviceSync.claim, {
        jobId: before!._id,
        version: before!.version,
      }),
    ).toBeNull();
    const claim = await backend.mutation(internal.serviceSync.claim, {
      jobId: after!._id,
      version: after!.version,
    });
    expect(claim?.url).toBeNull();
  });

  test("reconciliation recovers an interrupted run", async () => {
    const { backend, userId } = await setup();
    const jobId = await backend.run((ctx) =>
      ctx.db.insert("serviceSyncJobs", {
        key: `owner:${userId}`,
        target: { kind: "owner", userId, ownerKeys: [userId] },
        version: 1,
        runningVersion: 1,
        status: "running",
        attempts: 1,
        nextAttemptAt: 0,
        updatedAt: 0,
      }),
    );
    await backend.mutation(internal.serviceSync.reconcile, {});
    expect((await backend.run((ctx) => ctx.db.get(jobId)))?.status).toBe(
      "pending",
    );
  });
});

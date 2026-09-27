import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { createTestBackend } from "./test.setup";

afterEach(() => { vi.unstubAllEnvs(); });

async function setup() {
  vi.stubEnv("SHARED_SECRET", "local-click-test");
  const backend = createTestBackend();
  await backend.run(ctx => ctx.db.insert("users", { name: "Test", email: "test@example.test", membership: "pro", tokenIdentifier: "account" }));
  const client = backend.withIdentity({ tokenIdentifier: "account" });
  const link = await client.mutation(api.urlMainFuction.createUrl, { url: "https://example.com/test", slugType: "random", trackingEnabled: true });
  let n = 0;
  const click = () => backend.mutation(api.urlAnalytics.mutateUrlAnalytics, {
    urlId: link.docId, sharedSecret: "local-click-test", urlStatusMessage: "success", urlStatusCode: 302, requestId: `click-${++n}`,
  });
  return { backend, click };
}

describe("public click total", () => {
  test("stays hidden until seeded, then follows the platform counter", async () => {
    const { backend, click } = await setup();
    await click(); await click();
    await backend.mutation(internal.publicStats.refresh, {});
    expect(await backend.query(api.publicStats.getLiveClickTotal, {})).toBeNull();

    expect(await backend.action(internal.publicStats.seed, {})).toBe(2);
    expect((await backend.query(api.publicStats.getLiveClickTotal, {}))?.total).toBe(2);

    await click();
    await backend.mutation(internal.publicStats.refresh, {});
    expect((await backend.query(api.publicStats.getLiveClickTotal, {}))?.total).toBe(3);
  });

  test("seeding twice is refused and leaves the total alone", async () => {
    const { backend, click } = await setup();
    await click();
    await backend.action(internal.publicStats.seed, {});
    await expect(backend.action(internal.publicStats.seed, {})).rejects.toThrow(/already seeded/);
    expect((await backend.query(api.publicStats.getLiveClickTotal, {}))?.total).toBe(1);
  });
});

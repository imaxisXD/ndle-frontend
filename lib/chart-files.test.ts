import { afterEach, expect, test, vi } from "vitest";
import { loadCompleteChartFiles } from "./chart-files";
afterEach(() => vi.unstubAllGlobals());
const complete = () => ({ cold: [{ key: "exports/account=test/snapshot.parquet", size: 30 }], hot: null, meta: { coverage: { complete: true }, export: { complete: true, expiresAt: new Date(Date.now() + 600_000).toISOString() } } });
test("requests a complete expiring snapshot only when chart data is needed", async () => {
  const fetchMock = vi.fn<typeof fetch>(async () => Response.json(complete())); vi.stubGlobal("fetch", fetchMock);
  const result = await loadCompleteChartFiles("2026-09-01", "2026-09-05");
  expect(result.files).toHaveLength(1); expect(result.expiresAt).toBeGreaterThan(Date.now());
  expect(fetchMock.mock.calls[0][0]).toContain("includeFiles=true");
});
test("incomplete and expired snapshots never become an empty chart", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ cold: [], meta: { export: { complete: false } } })));
  await expect(loadCompleteChartFiles("2026-09-01", "2026-09-05")).rejects.toThrow("not ready");
  const expired = complete(); expired.meta.export.expiresAt = new Date(0).toISOString();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(expired)));
  await expect(loadCompleteChartFiles("2026-09-01", "2026-09-05")).rejects.toThrow("not ready");
});
test("failed export requests remain visible errors", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("busy", { status: 503 })));
  await expect(loadCompleteChartFiles("2026-09-01", "2026-09-05")).rejects.toThrow("503");
});

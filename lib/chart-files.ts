import type { ColdFile } from "@/types/analytics-v2";

export async function loadCompleteChartFiles(start: string, end: string): Promise<{ files: ColdFile[]; expiresAt: number }> {
  const params = new URLSearchParams({ start, end, includeFiles: "true" });
  const response = await fetch(`/api/analytics/v2?${params}`, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Chart data could not load (${response.status}). Try again.`);
  const payload = await response.json();
  const expiresAt = new Date(payload.meta?.export?.expiresAt).getTime();
  if (payload.meta?.export?.complete !== true || payload.meta?.coverage?.complete !== true || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("Complete chart data is not ready. Try again.");
  }
  const files: ColdFile[] = [...(payload.cold ?? []), ...(payload.hot ? [payload.hot] : [])];
  if (!files.length || files.some(file => typeof file.key !== "string" || !Number.isFinite(file.size))) {
    throw new Error("Chart data could not be verified. Try again.");
  }
  return { files, expiresAt };
}

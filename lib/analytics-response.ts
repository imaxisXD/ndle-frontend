import { z } from "zod";

const clickCount = z.number().finite().nonnegative();
const optionalLabel = z.string().nullable().optional();
const timeseriesRow = z.object({
  clicks: clickCount,
  time: z.string().optional(),
  bucket_start: z.string().optional(),
}).passthrough();
const breakdownRow = z.object({
  clicks: clickCount,
  label: optionalLabel,
  browser: optionalLabel,
  device: optionalLabel,
  os: optionalLabel,
  country: optionalLabel,
}).passthrough();
const sourceRow = z.object({
  clicks: clickCount,
  source: optionalLabel,
  referer_domain: optionalLabel,
}).passthrough();

/** Keep the service fields while supplying the names used by link charts. */
export function normalizeAnalyticsTimeseries(data: unknown) {
  return z.array(timeseriesRow).parse(data).map(row => {
    const bucket_start = row.bucket_start ?? row.time;
    if (!bucket_start || !Number.isFinite(Date.parse(bucket_start))) {
      throw new Error("Analytics returned an invalid date");
    }
    return { ...row, bucket_start };
  });
}

export function normalizeAnalyticsBreakdown(
  data: unknown,
  dimension: "browser" | "device" | "os" | "country",
) {
  return z.array(breakdownRow).parse(data).map(row => {
    if (!(dimension in row) && !("label" in row)) {
      throw new Error("Analytics returned an invalid category");
    }
    return { ...row, label: row.label ?? row[dimension] ?? "Unknown" };
  });
}

export function normalizeAnalyticsSources(data: unknown) {
  return z.array(sourceRow).parse(data).map(row => {
    if (!("source" in row) && !("referer_domain" in row)) {
      throw new Error("Analytics returned an invalid traffic source");
    }
    return { ...row, referer_domain: row.referer_domain ?? row.source ?? "Direct / None" };
  });
}

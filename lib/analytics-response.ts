import { z } from "zod";

const clickCount = z.number().finite().nonnegative();
const timeseriesRow = z
  .object({
    clicks: clickCount,
    time: z.string().optional(),
    bucket_start: z.string().optional(),
  })
  .passthrough();

/**
 * The analytics service returns UTC wall-clock times without a zone, such as
 * "2026-09-25 00:00:00". Browsers read those as local time, which moved every
 * daily bucket back a day east of UTC (India saw today's clicks under
 * yesterday). Mark them as UTC; values that already carry a zone are kept.
 */
export function asUtcTimestamp(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/.exec(value.trim());
  return match ? `${match[1]}T${match[2]}Z` : value;
}

/** Converts the named timestamp field of each row with {@link asUtcTimestamp}. */
export function withUtcTimestamps<T>(data: unknown, field: string): T {
  if (!Array.isArray(data)) return data as T;
  return data.map((row) =>
    row && typeof row === "object" && typeof row[field] === "string"
      ? { ...row, [field]: asUtcTimestamp(row[field]) }
      : row,
  ) as T;
}

/** Keep the service fields while supplying the names used by link charts. */
export function normalizeAnalyticsTimeseries(data: unknown) {
  return z
    .array(timeseriesRow)
    .parse(data)
    .map((row) => {
      const raw = row.bucket_start ?? row.time;
      const bucket_start = raw === undefined ? undefined : asUtcTimestamp(raw);
      if (!bucket_start || !Number.isFinite(Date.parse(bucket_start))) {
        throw new Error("Analytics returned an invalid date");
      }
      return {
        ...row,
        ...(row.time === undefined ? {} : { time: asUtcTimestamp(row.time) }),
        bucket_start,
      };
    });
}

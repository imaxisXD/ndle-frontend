import { getUtcRange, type AnalyticsRange } from "@/lib/analyticsRanges";
import { addDays, localMidnight } from "@/lib/local-dates";

type TimeseriesResponse = {
  data?: Array<{ bucket_start: string; clicks: number }>;
  /** Present when the service answered local calendar days for this zone. */
  timezone?: string;
  range?: { start: string; end: string };
  firstEventDate?: string | null;
};

// "All time" and other long ranges start at the first day with data rather
// than drawing one empty point per day since 1970.
const MAX_EMPTY_LEAD_DAYS = 400;

function utcDay(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * One point per calendar day, with missing days as zero. Local-day answers
 * are placed at the viewer's midnight. UTC-day answers from an older service
 * are placed at UTC noon, which falls on the same date for almost every zone.
 */
export function buildClickTimeline(
  response: TimeseriesResponse | undefined,
  range: AnalyticsRange,
  now = new Date(),
): Array<{ time: string; clicks: number }> {
  const rows = response?.data ?? [];
  if (!rows.length) return [];
  const local = Boolean(response?.timezone && response.range);
  const clicks = new Map<string, number>();
  for (const row of rows) {
    const day = local
      ? row.bucket_start.slice(0, 10)
      : utcDay(row.bucket_start);
    clicks.set(day, (clicks.get(day) ?? 0) + row.clicks);
  }
  const firstDataDay = [...clicks.keys()].sort()[0];
  let start: string;
  let end: string;
  if (local && response?.range) {
    start =
      range === "all"
        ? (response.firstEventDate ?? firstDataDay)
        : response.range.start;
    end = response.range.end;
  } else {
    const utc = getUtcRange(range);
    start = utc.start.toISOString().slice(0, 10);
    end = now.toISOString().slice(0, 10);
  }
  if (firstDataDay && addDays(start, MAX_EMPTY_LEAD_DAYS) < firstDataDay)
    start = firstDataDay;
  const points: Array<{ time: string; clicks: number }> = [];
  for (let day = start; day <= end; day = addDays(day, 1))
    points.push({
      time: local ? localMidnight(day) : `${day}T12:00:00.000Z`,
      clicks: clicks.get(day) ?? 0,
    });
  return points;
}

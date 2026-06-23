import type { AnalyticsRange } from "@/lib/analyticsRanges";

const FREE_ALLOWED_RANGES = new Set<AnalyticsRange>(["24h", "7d", "30d"]);
const DAY_MS = 24 * 60 * 60 * 1000;

export type AnalyticsViewerPlan = "guest" | "free" | "pro";

export function getRangeAccessError(
  range: AnalyticsRange,
  viewerPlan?: AnalyticsViewerPlan | null,
): string | null {
  if (viewerPlan === "pro" || FREE_ALLOWED_RANGES.has(range)) {
    return null;
  }
  return "This analytics range requires a Pro plan.";
}

export function getDateWindowAccessError(
  start: string,
  end: string,
  viewerPlan?: AnalyticsViewerPlan | null,
): string | null {
  const startTime = Date.parse(`${start}T00:00:00.000Z`);
  const endTime = Date.parse(`${end}T00:00:00.000Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return "Invalid date range";
  }

  const inclusiveDays = Math.floor((endTime - startTime) / DAY_MS) + 1;
  return viewerPlan === "pro" || inclusiveDays <= 30
    ? null
    : "This analytics date range requires a Pro plan.";
}

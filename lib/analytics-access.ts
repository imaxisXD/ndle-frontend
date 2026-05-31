import type { AnalyticsRange } from "@/lib/analyticsRanges";

const FREE_ALLOWED_RANGES = new Set<AnalyticsRange>(["24h", "7d", "30d"]);
const DAY_MS = 24 * 60 * 60 * 1000;

function readClaimValue(
  claims: unknown,
  key: "plan" | "membership",
): unknown {
  const record = claims as Record<string, unknown> | null | undefined;
  const metadata = record?.public_metadata as
    | Record<string, unknown>
    | null
    | undefined;
  return record?.[key] ?? metadata?.[key];
}

export function isProAnalyticsSession(claims: unknown): boolean {
  return (
    readClaimValue(claims, "plan") === "pro" ||
    readClaimValue(claims, "membership") === "pro"
  );
}

export function getRangeAccessError(
  range: AnalyticsRange,
  claims: unknown,
): string | null {
  if (isProAnalyticsSession(claims) || FREE_ALLOWED_RANGES.has(range)) {
    return null;
  }
  return "This analytics range requires a Pro plan.";
}

export function getDateWindowAccessError(
  start: string,
  end: string,
  claims: unknown,
): string | null {
  if (isProAnalyticsSession(claims)) {
    return null;
  }

  const startTime = Date.parse(`${start}T00:00:00.000Z`);
  const endTime = Date.parse(`${end}T00:00:00.000Z`);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return "Invalid date range";
  }

  const inclusiveDays = Math.floor((endTime - startTime) / DAY_MS) + 1;
  return inclusiveDays <= 30
    ? null
    : "This analytics date range requires a Pro plan.";
}

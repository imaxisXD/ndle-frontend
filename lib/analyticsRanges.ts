// UTC time range helpers for analytics
export type AnalyticsRange =
  | "24h"
  | "7d"
  | "30d"
  | "3mo"
  | "12mo"
  | "mtd"
  | "qtd"
  | "ytd"
  | "all";

function toUtcDate(y: number, m: number, d: number, h = 0, mi = 0, s = 0) {
  return new Date(Date.UTC(y, m, d, h, mi, s, 0));
}

function startOfUtcMonth(d: Date) {
  return toUtcDate(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

function startOfUtcQuarter(d: Date) {
  const q = Math.floor(d.getUTCMonth() / 3);
  return toUtcDate(d.getUTCFullYear(), q * 3, 1);
}

function startOfUtcYear(d: Date) {
  return toUtcDate(d.getUTCFullYear(), 0, 1);
}

export function getUtcRange(range: AnalyticsRange): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
      0,
      0,
    ),
  );

  if (range === "24h") {
    return { start: new Date(end.getTime() - 24 * 60 * 60 * 1000), end };
  }
  if (range === "7d") {
    return { start: new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000), end };
  }
  if (range === "30d") {
    return { start: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000), end };
  }
  if (range === "3mo") {
    const threeMonthsAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, now.getUTCDate()),
    );
    return { start: threeMonthsAgo, end };
  }
  if (range === "12mo") {
    const twelveMonthsAgo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 12, now.getUTCDate()),
    );
    return { start: twelveMonthsAgo, end };
  }
  if (range === "mtd") {
    return { start: startOfUtcMonth(now), end };
  }
  if (range === "qtd") {
    return { start: startOfUtcQuarter(now), end };
  }
  if (range === "ytd") {
    return { start: startOfUtcYear(now), end };
  }
  // all: caller should clamp server-side as needed
  return { start: new Date(0), end };
}

export function formatForTinybird(dt: Date): string {
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const HH = String(dt.getUTCHours()).padStart(2, "0");
  const MM = String(dt.getUTCMinutes()).padStart(2, "0");
  const SS = String(dt.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
}

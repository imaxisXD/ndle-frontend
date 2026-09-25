import type { AnalyticsRange } from "@/lib/analyticsRanges";

const formatters = new Map<string, Intl.DateTimeFormat>();

function dayFormatter(timeZone: string): Intl.DateTimeFormat {
  let format = formatters.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(timeZone, format);
  }
  return format;
}

export function isValidTimeZone(
  value: string | null | undefined,
): value is string {
  if (!value || value.length > 64) return false;
  try {
    dayFormatter(value);
    return true;
  } catch {
    return false;
  }
}

/** The viewer's IANA zone, e.g. "Asia/Kolkata". */
export function browserTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimeZone(zone) ? zone : undefined;
  } catch {
    return undefined;
  }
}

/** Calendar date ("YYYY-MM-DD") of an instant in a zone. */
export function localDate(instant: Date, timeZone: string): string {
  return dayFormatter(timeZone).format(instant);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, day))
    .toISOString()
    .slice(0, 10);
}

/** Whole local days covered by a range, mirroring the UTC range rules. */
export function getLocalDayRange(
  range: AnalyticsRange,
  timeZone: string,
  now = new Date(),
): { start: string; end: string } {
  const end = localDate(now, timeZone);
  const [year, month] = end.split("-").map(Number);
  const pad = (value: number) => String(value).padStart(2, "0");
  switch (range) {
    case "24h":
      return { start: end, end };
    case "7d":
      return { start: addDays(end, -6), end };
    case "30d":
      return { start: addDays(end, -29), end };
    case "3mo":
      return { start: addMonths(end, -3), end };
    case "12mo":
      return { start: addMonths(end, -12), end };
    case "mtd":
      return { start: `${year}-${pad(month)}-01`, end };
    case "qtd":
      return {
        start: `${year}-${pad(Math.floor((month - 1) / 3) * 3 + 1)}-01`,
        end,
      };
    case "ytd":
      return { start: `${year}-01-01`, end };
    default:
      // "all": the service starts at the account's first event.
      return { start: "1970-01-01", end };
  }
}

/** Local midnight of a calendar day in the browser, as an instant for charts. */
export function localMidnight(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toISOString();
}

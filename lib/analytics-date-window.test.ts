// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { getAnalyticsDateWindow } from "./analytics-date-window";

afterEach(() => vi.unstubAllEnvs());

test.each(["Asia/Kolkata", "Pacific/Kiritimati", "America/Los_Angeles"])(
  "report dates stay in UTC when the browser uses %s",
  (timezone) => {
    vi.stubEnv("TZ", timezone);
    for (const instant of ["2026-09-05T20:00:00Z", "2026-09-05T01:00:00Z"]) {
      expect(getAnalyticsDateWindow("24h", new Date(instant))).toEqual({
        start: "2026-09-05",
        end: "2026-09-05",
      });
      expect(getAnalyticsDateWindow("30d", new Date(instant))).toEqual({
        start: "2026-08-07",
        end: "2026-09-05",
      });
    }
  },
);

test("rolling windows preserve inclusive day counts across a leap day", () => {
  for (const [range, days] of [
    ["24h", 1],
    ["7d", 7],
    ["30d", 30],
    ["3m", 90],
    ["12m", 365],
  ] as const) {
    const window = getAnalyticsDateWindow(
      range,
      new Date("2024-03-01T00:05:00Z"),
    );
    expect(
      (Date.parse(window.end) - Date.parse(window.start)) / 86400000 + 1,
    ).toBe(days);
  }
});

test("calendar windows start on the UTC month, quarter and year", () => {
  vi.stubEnv("TZ", "Pacific/Kiritimati");
  const now = new Date("2026-03-31T20:00:00Z");
  expect(getAnalyticsDateWindow("mtd", now)).toEqual({
    start: "2026-03-01",
    end: "2026-03-31",
  });
  expect(getAnalyticsDateWindow("qtd", now)).toEqual({
    start: "2026-01-01",
    end: "2026-03-31",
  });
  expect(getAnalyticsDateWindow("ytd", now)).toEqual({
    start: "2026-01-01",
    end: "2026-03-31",
  });
});

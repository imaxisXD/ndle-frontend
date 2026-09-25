import { afterEach, describe, expect, it, vi } from "vitest";
import { buildClickTimeline } from "@/lib/click-timeline";
import { getLocalDayRange } from "@/lib/local-dates";

afterEach(() => vi.useRealTimers());

describe("buildClickTimeline", () => {
  it("uses the viewer's calendar days when the service returns them", () => {
    const points = buildClickTimeline(
      {
        timezone: "Asia/Kolkata",
        range: { start: "2026-09-20", end: "2026-09-26" },
        firstEventDate: "2025-12-06",
        data: [
          { bucket_start: "2026-09-22", clicks: 1 },
          { bucket_start: "2026-09-26", clicks: 2 },
        ],
      },
      "7d",
    );
    expect(points.map((point) => point.clicks)).toEqual([0, 0, 1, 0, 0, 0, 2]);
    expect(points).toHaveLength(7);
    // Local midnight in the browser, so chart labels show the same day.
    const last = new Date(points[6].time);
    expect([last.getFullYear(), last.getMonth() + 1, last.getDate()]).toEqual([
      2026, 9, 26,
    ]);
  });

  it("starts all-time charts at the first event instead of 1970", () => {
    const points = buildClickTimeline(
      {
        timezone: "UTC",
        range: { start: "1970-01-01", end: "2026-01-05" },
        firstEventDate: "2026-01-03",
        data: [{ bucket_start: "2026-01-03", clicks: 4 }],
      },
      "all",
    );
    expect(points.map((point) => point.clicks)).toEqual([4, 0, 0]);
  });

  it("keeps UTC days from an older service on their own date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-25T22:45:00Z"));
    const points = buildClickTimeline(
      {
        data: [
          { bucket_start: "2026-09-25T00:00:00Z", clicks: 2 },
          { bucket_start: "2026-09-22T00:00:00Z", clicks: 1 },
        ],
      },
      "7d",
    );
    expect(points).toHaveLength(7);
    expect(points.at(-1)).toEqual({
      time: "2026-09-25T12:00:00.000Z",
      clicks: 2,
    });
    expect(points[3]).toEqual({ time: "2026-09-22T12:00:00.000Z", clicks: 1 });
  });

  it("returns no points without data", () => {
    expect(buildClickTimeline(undefined, "7d")).toEqual([]);
  });
});

describe("getLocalDayRange", () => {
  const now = new Date("2026-09-25T22:45:00Z");
  it("follows the viewer's today, which can differ from UTC", () => {
    expect(getLocalDayRange("7d", "Asia/Kolkata", now)).toEqual({
      start: "2026-09-20",
      end: "2026-09-26",
    });
    expect(getLocalDayRange("7d", "UTC", now)).toEqual({
      start: "2026-09-19",
      end: "2026-09-25",
    });
    expect(getLocalDayRange("mtd", "Asia/Kolkata", now)).toEqual({
      start: "2026-09-01",
      end: "2026-09-26",
    });
    expect(getLocalDayRange("qtd", "America/Los_Angeles", now)).toEqual({
      start: "2026-07-01",
      end: "2026-09-25",
    });
  });
});

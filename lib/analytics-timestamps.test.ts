import { describe, expect, it } from "vitest";
import {
  asUtcTimestamp,
  normalizeAnalyticsTimeseries,
  withUtcTimestamps,
} from "@/lib/analytics-response";

describe("analytics timestamps", () => {
  it("reads the service's zone-less times as UTC in every browser time zone", () => {
    const bucket = asUtcTimestamp("2026-09-25 00:00:00");
    expect(bucket).toBe("2026-09-25T00:00:00Z");
    // Date.parse of a zoned value does not depend on the viewer's time zone.
    expect(Date.parse(bucket)).toBe(Date.UTC(2026, 8, 25));
    expect(new Date(bucket).getUTCDate()).toBe(25);
    expect(asUtcTimestamp("2026-09-25 22:39:19.499")).toBe(
      "2026-09-25T22:39:19.499Z",
    );
  });

  it("keeps values that already carry a zone or are plain dates", () => {
    expect(asUtcTimestamp("2026-09-25T00:00:00.000Z")).toBe(
      "2026-09-25T00:00:00.000Z",
    );
    expect(asUtcTimestamp("2026-09-25T05:30:00+05:30")).toBe(
      "2026-09-25T05:30:00+05:30",
    );
    expect(asUtcTimestamp("2026-09-25")).toBe("2026-09-25");
  });

  it("normalizes daily buckets and per-row fields", () => {
    expect(
      normalizeAnalyticsTimeseries([
        { time: "2026-09-25 00:00:00", clicks: 2 },
      ]),
    ).toEqual([
      {
        time: "2026-09-25T00:00:00Z",
        bucket_start: "2026-09-25T00:00:00Z",
        clicks: 2,
      },
    ]);
    expect(
      withUtcTimestamps(
        [{ minute_ts: "2026-09-25 22:39:00", clicks: 1 }],
        "minute_ts",
      ),
    ).toEqual([{ minute_ts: "2026-09-25T22:39:00Z", clicks: 1 }]);
    expect(withUtcTimestamps(null, "minute_ts")).toBeNull();
  });
});

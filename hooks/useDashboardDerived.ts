"use client";

import { useMemo } from "react";
import type { AnalyticsRange } from "@/lib/analyticsRanges";
import { getUtcRange } from "@/lib/analyticsRanges";

export type LatencyBucket = { range: string; count: number };

type TimeseriesRow = {
  bucket_start: string;
  clicks: number;
  human_clicks?: number;
  bot_clicks?: number;
  avg_latency?: number | null;
};

type SnapshotTuples = Array<[string | null, number]>;
type SnapshotPayload = {
  browsers?: SnapshotTuples;
  devices?: SnapshotTuples;
  os?: SnapshotTuples;
  countries?: SnapshotTuples;
  datacenters?: SnapshotTuples;
  traffic_sources?: SnapshotTuples;
  top_links?: SnapshotTuples;
};

export type DashboardPayload = {
  timeseries?: { data: Array<TimeseriesRow> };
  snapshot?: SnapshotPayload;
} | null;

export function useDashboardDerived({
  payload,
  range,
}: {
  payload: DashboardPayload;
  range: AnalyticsRange;
}) {
  return useMemo(() => {
    const snapPayload: SnapshotPayload = payload?.snapshot ?? {};
    const tsRows: Array<TimeseriesRow> = payload?.timeseries?.data ?? [];

    const formatBucket = (s: string) => {
      const d = new Date(s);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    const formatHour = (s: string) => {
      const d = new Date(s);
      const HH = String(d.getUTCHours()).padStart(2, "0");
      return `${HH}:00`;
    };

    // Build a day -> clicks map for zero-filling
    const dayToClicks = new Map<string, number>();
    for (const r of tsRows) {
      const key = formatBucket(r.bucket_start);
      dayToClicks.set(key, (dayToClicks.get(key) ?? 0) + r.clicks);
    }

    // Zero-fill clicks timeline
    const clicksTimelineData: Array<{ time: string; clicks: number }> = [];
    if (tsRows.length > 0) {
      const { start, end } = getUtcRange(range);
      const startDay = new Date(
        Date.UTC(
          start.getUTCFullYear(),
          start.getUTCMonth(),
          start.getUTCDate(),
        ),
      );
      const endDay = new Date(
        Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
      );
      for (
        let d = startDay;
        d.getTime() <= endDay.getTime();
        d = new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1),
        )
      ) {
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        const key = `${yyyy}-${mm}-${dd}`;
        clicksTimelineData.push({
          time: key,
          clicks: dayToClicks.get(key) ?? 0,
        });
      }
    }

    const hourlyActivityData = tsRows.map((r) => ({
      hour: formatHour(r.bucket_start),
      clicks: r.clicks,
    }));

    const humanClicks = tsRows.reduce(
      (s: number, r) => s + (r.human_clicks ?? 0),
      0,
    );
    const botClicks = tsRows.reduce(
      (s: number, r) => s + (r.bot_clicks ?? 0),
      0,
    );
    const botHumanData = [
      {
        name: "Human Traffic",
        value: humanClicks,
        color: "var(--color-green-500)",
      },
      { name: "Bot Traffic", value: botClicks, color: "var(--color-red-500)" },
    ];

    const toBreakdown = (tuples?: Array<[string | null, number]>) =>
      (tuples ?? []).map((t) => ({
        label: t?.[0] ?? "unknown",
        clicks: t?.[1] ?? 0,
      }));
    const browserRows = toBreakdown(snapPayload?.browsers);
    const countryRows = toBreakdown(snapPayload?.countries);
    const deviceRows = toBreakdown(snapPayload?.devices);
    const osRows = toBreakdown(snapPayload?.os);

    const browserData = browserRows.map((r) => ({
      month: r.label ?? "unknown",
      clicks: r.clicks ?? 0,
    }));
    const countryData = countryRows.map((r) => ({
      country: r.label ?? "unknown",
      clicks: r.clicks ?? 0,
    }));
    const deviceData = deviceRows.map((r) => ({
      device: r.label ?? "unknown",
      clicks: r.clicks ?? 0,
    }));
    const osData = osRows.map((r) => ({
      os: r.label ?? "unknown",
      clicks: r.clicks ?? 0,
    }));

    const latencyBuckets: Array<LatencyBucket> = (() => {
      const buckets: Record<string, number> = {
        "0-100ms": 0,
        "100-300ms": 0,
        "300-500ms": 0,
        "500ms+": 0,
      };
      for (const r of tsRows) {
        const count = r.clicks ?? 0;
        const latency = r.avg_latency ?? null;
        if (latency === null || latency === undefined) continue;
        if (latency < 100) buckets["0-100ms"] += count;
        else if (latency < 300) buckets["100-300ms"] += count;
        else if (latency < 500) buckets["300-500ms"] += count;
        else buckets["500ms+"] += count;
      }
      return Object.entries(buckets).map(([range, count]) => ({
        range,
        count,
      }));
    })();

    return {
      clicksTimelineData,
      hourlyActivityData,
      botHumanData,
      browserData,
      countryData,
      deviceData,
      osData,
      latencyBuckets,
    } as const;
  }, [payload, range]);
}

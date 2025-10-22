import { useParams, useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BinMinusIn } from "iconoir-react";
import { BrowserChart } from "@/components/charts/browser-chart";
import { CountryChart } from "@/components/charts/country-chart";
import { DeviceOSChart } from "@/components/charts/device-os-chart";
import { ClicksTimelineChart } from "@/components/charts/clicks-timeline-chart";
import { BotTrafficChart } from "@/components/charts/bot-traffic-chart";
import { LatencyChart } from "@/components/charts/latency-chart";
import { HourlyActivityChart } from "@/components/charts/hourly-activity-chart";
import { LiveClickHero } from "@/components/charts/live-click-hero";
import { useEffect, useState } from "react";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import type { AnalyticsRange } from "@/lib/analyticsRanges";
import { getUtcRange } from "@/lib/analyticsRanges";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import LinkDetailSkeleton from "@/components/skeleton-routes/link-detail-skeleton";
import MetadataCard from "@/components/metadata-card";
import LinkWithIcon from "@/components/ui/link-with-icon";
import { makeShortLink } from "@/lib/config";

export default function LinkDetailRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const { add } = useToast();
  const slug = params[":slug"] || params.slug || "unknown";
  const [range, setRange] = useState<AnalyticsRange>("7d");

  const dashboardRes = useQuery(api.analyticsCache.getAnalytics, {
    range,
    linkSlug: String(slug),
    scope: "dashboard",
  });
  const requestRefresh = useMutation(api.analyticsCache.requestRefresh);

  useEffect(() => {
    if (!dashboardRes || !dashboardRes.fresh) {
      void requestRefresh({
        range,
        linkSlug: String(slug),
        scope: "dashboard",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardRes?.fresh, range, slug, requestRefresh]);

  const shortUrl = makeShortLink(String(slug));
  const deleteUrl = useMutation(api.urlMainFuction.deleteUrl);
  const queryResult = useQuery(api.urlAnalytics.getUrlAnalytics, {
    urlSlug: slug,
  });

  if (!queryResult) {
    return <LinkDetailSkeleton shortUrl={shortUrl} />;
  }

  const { analytics: analyticsData, url, isError, message } = queryResult;

  if (isError && message !== "") {
    add({
      type: "error",
      title: "Error",
      description: message,
    });
  }

  type TimeseriesRow = {
    bucket_start: string;
    clicks: number;
    human_clicks?: number;
    bot_clicks?: number;
  };
  type BreakdownRow = { label: string | null; clicks: number };

  // Extract data from Convex cached payload
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
  const payload = (dashboardRes?.data ?? null) as {
    timeseries?: { data: Array<TimeseriesRow> };
    snapshot?: SnapshotPayload;
  } | null;
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

  // Zero-fill from selected range start..end so the area chart has a flat baseline
  const clicksTimelineData: Array<{ time: string; clicks: number }> = [];
  if (tsRows.length > 0) {
    const { start, end } = getUtcRange(range);
    const startDay = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
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
      clicksTimelineData.push({ time: key, clicks: dayToClicks.get(key) ?? 0 });
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
  const botClicks = tsRows.reduce((s: number, r) => s + (r.bot_clicks ?? 0), 0);
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
  const browserRows: Array<BreakdownRow> = toBreakdown(snapPayload?.browsers);
  const countryRows: Array<BreakdownRow> = toBreakdown(snapPayload?.countries);
  const deviceRows: Array<BreakdownRow> = toBreakdown(snapPayload?.devices);
  const osRows: Array<BreakdownRow> = toBreakdown(snapPayload?.os);

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
  console.log("snapPayload", snapPayload);
  console.log("payload", payload);
  return (
    <>
      <header className="space-y-4">
        <div className="text-primary mb-14 flex flex-col items-start gap-3">
          <LinkWithIcon link={shortUrl} href={`https://${shortUrl}`} />
          <p className="text-muted-foreground text-sm">
            Link analytics and settings
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
          <TimeRangeSelector value={range} onChange={setRange} />
        </div>
        <LiveClickHero counterValue={analyticsData?.totalClickCounts || 0} />
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <ClicksTimelineChart data={clicksTimelineData} />
        <BrowserChart data={browserData} />
        <CountryChart data={countryData} />
        <DeviceOSChart deviceData={deviceData} osData={osData} />
        <BotTrafficChart data={botHumanData} />
        <LatencyChart />
        <HourlyActivityChart data={hourlyActivityData} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <MetadataCard
          shortslug={url?.slugAssigned}
          fullurl={url?.fullurl}
          trackingEnabled={url?.trackingEnabled}
          creationTime={url?._creationTime}
        />

        <Card className="border-red-500">
          <CardHeader className="rounded-t-xl border-red-500 bg-red-50">
            <CardTitle className="text-red-600">Delete Link</CardTitle>
            <CardToolbar>
              <Button
                variant="destructive"
                type="button"
                onClick={async () => {
                  await deleteUrl({ urlSlug: slug });
                  navigate("/");
                  add({
                    type: "success",
                    title: "Link deleted",
                    description: `The link has been deleted successfully`,
                  });
                }}
              >
                <BinMinusIn className="h-4 w-4" /> Delete Link
              </Button>
            </CardToolbar>
          </CardHeader>
          <CardContent className="flex flex-col items-start justify-between gap-2">
            <CardDescription className="">
              Delete this shortened link permanently.
            </CardDescription>
            <p className="text-muted-foreground mt-1 text-xs">
              This will remove all the data associated with this link, including
              clicks, analytics and metadata.
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

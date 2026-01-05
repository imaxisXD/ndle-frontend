import { useParams, useNavigate } from "react-router";
import { useState, useMemo } from "react";
import type { AnalyticsRange } from "@/lib/analyticsRanges";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import LinkDetailSkeleton from "@/components/skeleton-routes/link-detail-skeleton";
import { makeShortLinkWithDomain } from "@/lib/config";
import { LinkHeader } from "@/components/LinkHeader";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { DeleteLinkCard } from "@/components/DeleteLinkCard";
import { LinkSettingsPanel } from "@/components/LinkSettingsPanel";
import { LinkActivityLog } from "@/components/LinkActivityLog";
import { LinkAIChatPanel } from "@/components/LinkAIChatPanel";
import { LinkHealthPanel } from "@/components/LinkHealthPanel";
import {
  useTimeseries,
  useBreakdown,
  useTrafficSources,
} from "@/hooks/useAnalytics";
import { getUtcRange } from "@/lib/analyticsRanges";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/base-tabs";
import { GraphUp, Settings, List, MagicWand, ShieldCheck } from "iconoir-react";

export default function LinkDetailRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const { add } = useToast();
  const slug = params[":slug"] || params.slug || "unknown";
  const [range, setRange] = useState<AnalyticsRange>("7d");

  // Direct API calls via TanStack Query (bypasses Convex, uses DuckDB backend)
  const timeseries = useTimeseries({
    range,
    linkSlug: String(slug),
    scope: "link",
  });
  const browsers = useBreakdown({
    dimension: "browser",
    range,
    linkSlug: String(slug),
    scope: "link",
  });
  const devices = useBreakdown({
    dimension: "device",
    range,
    linkSlug: String(slug),
    scope: "link",
  });
  const os = useBreakdown({
    dimension: "os",
    range,
    linkSlug: String(slug),
    scope: "link",
  });
  const countries = useBreakdown({
    dimension: "country",
    range,
    linkSlug: String(slug),
    scope: "link",
  });
  const referers = useTrafficSources({
    range,
    linkSlug: String(slug),
    scope: "link",
  });

  // Derive display data from raw analytics
  const derived = useMemo(() => {
    const tsRows = timeseries.data?.data ?? [];

    const formatBucket = (s: string) => {
      const d = new Date(s);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(d.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    const formatHour = (s: string) => {
      const d = new Date(s);
      return String(d.getUTCHours()).padStart(2, "0") + ":00";
    };

    // Build day -> clicks map for zero-filling
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
        d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
      ) {
        const key = formatBucket(d.toISOString());
        clicksTimelineData.push({
          time: key,
          clicks: dayToClicks.get(key) ?? 0,
        });
      }
    }

    // Hourly activity
    const hourToClicks = new Map<string, number>();
    for (const r of tsRows) {
      const hh = formatHour(r.bucket_start);
      hourToClicks.set(hh, (hourToClicks.get(hh) ?? 0) + r.clicks);
    }
    const hourlyActivityData = Array.from({ length: 24 }, (_, i) => {
      const hh = String(i).padStart(2, "0") + ":00";
      return { hour: hh, clicks: hourToClicks.get(hh) ?? 0 };
    });

    // Bot/human pie
    let totalHuman = 0;
    let totalBot = 0;
    for (const r of tsRows) {
      totalHuman += r.human_clicks ?? r.clicks;
      totalBot += r.bot_clicks ?? 0;
    }
    const botHumanData = [
      { name: "Human", value: totalHuman, color: "#22c55e" },
      { name: "Bot", value: totalBot, color: "#ef4444" },
    ];

    // Latency buckets (placeholder)
    const latencyBuckets = [
      { range: "< 50ms", count: 0 },
      { range: "50-100ms", count: 0 },
      { range: "100-200ms", count: 0 },
      { range: "200-500ms", count: 0 },
      { range: "> 500ms", count: 0 },
    ];

    // Breakdown data - transform to match AnalyticsSection prop types
    const browserData = (browsers.data?.data ?? []).map(
      (row: { label: string; clicks: number }) => ({
        month: row.label ?? "Unknown",
        clicks: row.clicks,
      }),
    );

    const countryData = (countries.data?.data ?? []).map(
      (row: { label: string; clicks: number }) => ({
        country: row.label ?? "Unknown",
        clicks: row.clicks,
      }),
    );

    const deviceData = (devices.data?.data ?? []).map(
      (row: { label: string; clicks: number }) => ({
        device: row.label ?? "Unknown",
        clicks: row.clicks,
      }),
    );

    const osData = (os.data?.data ?? []).map(
      (row: { label: string; clicks: number }) => ({
        os: row.label ?? "Unknown",
        clicks: row.clicks,
      }),
    );

    // Referrer data from traffic sources
    const referrerData = (referers.data?.data ?? []).map(
      (row: { referer_domain: string; clicks: number }) => {
        return {
          domain: row.referer_domain || "Direct / None",
          clicks: row.clicks,
        };
      },
    );

    return {
      clicksTimelineData,
      browserData,
      countryData,
      deviceData,
      osData,
      botHumanData,
      latencyBuckets,
      hourlyActivityData,
      referrerData,
    };
  }, [
    timeseries.data,
    browsers.data,
    countries.data,
    devices.data,
    os.data,
    referers.data,
    range,
  ]);

  const isAnalyticsLoading =
    timeseries.isLoading ||
    browsers.isLoading ||
    devices.isLoading ||
    os.isLoading ||
    countries.isLoading ||
    referers.isLoading;

  const deleteUrl = useMutation(api.urlMainFuction.deleteUrl);
  const queryResult = useQuery(api.urlAnalytics.getUrlAnalytics, {
    urlSlug: slug,
  });

  const skeleton = !queryResult;
  const {
    analytics: analyticsData,
    url,
    isError,
    message,
  } = queryResult ?? {
    analytics: null,
    url: null,
    isError: false,
    message: "",
  };

  // Build shortUrl using custom domain if available (after url is defined)
  const shortUrl = makeShortLinkWithDomain(String(slug), url?.customDomain);

  if (isError && message !== "") {
    add({
      type: "error",
      title: "Error",
      description: message,
    });
  }

  const handleDownloadQR = () => {
    // TODO: Implement QR download functionality
    add({
      type: "success",
      title: "QR Download",
      description: "QR download functionality coming soon!",
    });
  };

  const handleDelete = async () => {
    await deleteUrl({ urlSlug: slug });
    navigate("/");
    add({
      type: "success",
      title: "Link deleted",
      description: `The link has been deleted successfully`,
    });
  };

  if (skeleton) {
    return <LinkDetailSkeleton shortUrl={shortUrl} />;
  }

  return (
    <div className="space-y-8">
      <LinkHeader
        shortUrl={shortUrl}
        fullUrl={url?.fullurl}
        range={range}
        onRangeChange={setRange}
        totalClickCounts={analyticsData?.totalClickCounts || 0}
        qrEnabled={url?.qrEnabled}
        expiresAt={url?.expiresAt}
        creationTime={url?._creationTime}
        onDownloadQR={url?.qrEnabled ? handleDownloadQR : undefined}
      />

      {/* Tabbed Navigation */}
      <Tabs defaultValue="analytics">
        <TabsList variant="line" size="md" className="mb-6">
          <TabsTrigger value="analytics">
            <GraphUp className="size-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="activity">
            <List className="size-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="ai-chat">
            <MagicWand className="size-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="health">
            <ShieldCheck className="size-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AnalyticsSection
            clicksTimelineData={derived.clicksTimelineData}
            browserData={derived.browserData}
            countryData={derived.countryData}
            deviceData={derived.deviceData}
            osData={derived.osData}
            botHumanData={derived.botHumanData}
            latencyBuckets={derived.latencyBuckets}
            hourlyActivityData={derived.hourlyActivityData}
            referrerData={derived.referrerData}
            isLoading={isAnalyticsLoading}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <LinkSettingsPanel
              fullUrl={url?.fullurl}
              trackingEnabled={url?.trackingEnabled}
              expiresAt={url?.expiresAt}
              qrEnabled={url?.qrEnabled}
              qrStyle={url?.qrStyle}
              creationTime={url?._creationTime}
            />

            {/* Danger Zone */}
            <div className="pt-6">
              <h3 className="text-muted-foreground mb-4 text-sm font-medium">
                Danger Zone
              </h3>
              <DeleteLinkCard onDelete={handleDelete} />
            </div>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <LinkActivityLog />
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="ai-chat">
          <LinkAIChatPanel shortUrl={shortUrl} fullUrl={url?.fullurl || ""} />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health">
          <LinkHealthPanel urlId={url?._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

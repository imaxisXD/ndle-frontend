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
import { LinkNotesPanel } from "@/components/LinkNotesPanel";
import { LinkHealthPanel } from "@/components/LinkHealthPanel";
import {
  useTimeseries,
  useBreakdown,
  useTrafficSources,
  useVariantPerformance,
} from "@/hooks/useAnalytics";
import { getUtcRange } from "@/lib/analyticsRanges";
import {
  getVariantName,
  type VariantLabels,
} from "@/components/charts/variant-performance-chart";
import { useAnalyticsV2 } from "@/hooks/useAnalyticsV2";
import { useRefreshLinkAnalytics } from "@/hooks/use-refresh-link-analytics";
import { buildClickTimeline } from "@/lib/click-timeline";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/base-tabs";
import { GraphUp, Settings, List, Bookmark, ShieldCheck } from "iconoir-react";

const linkTabClassName =
  "min-w-0 flex-col gap-1 text-xs sm:flex-row sm:gap-2 sm:text-sm";

export default function LinkDetailRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const { add } = useToast();
  const slug = params[":slug"] || params.slug || "unknown";
  const [range, setRange] = useState<AnalyticsRange>("7d");
  // Bots are counted by default; the filter removes them from every chart.
  const [excludeBots, setExcludeBots] = useState(false);

  // Fetch link config to check for A/B testing
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

  const isABTestEnabled =
    url && url.abEnabled && url.abVariants && url.abVariants.length > 0;
  const linkId = url?.linkId || url?._id;
  useRefreshLinkAnalytics({
    linkSlug: String(slug),
    linkId: linkId ? String(linkId) : undefined,
    liveClickCount: analyticsData?.totalClickCounts,
  });

  // Direct API calls via TanStack Query (bypasses Convex, uses DuckDB backend)
  const timeseries = useTimeseries({
    range,
    linkSlug: String(slug),
    scope: "link",
    excludeBots,
  });
  const browsers = useBreakdown({
    dimension: "browser",
    range,
    linkSlug: String(slug),
    scope: "link",
    excludeBots,
  });
  const devices = useBreakdown({
    dimension: "device",
    range,
    linkSlug: String(slug),
    scope: "link",
    excludeBots,
  });
  const os = useBreakdown({
    dimension: "os",
    range,
    linkSlug: String(slug),
    scope: "link",
    excludeBots,
  });
  const countries = useBreakdown({
    dimension: "country",
    range,
    linkSlug: String(slug),
    scope: "link",
    excludeBots,
  });
  const referers = useTrafficSources({
    range,
    linkSlug: String(slug),
    scope: "link",
    excludeBots,
  });
  const trafficRange = getUtcRange(range);
  const trafficSummary = useAnalyticsV2({
    start: trafficRange.start.toISOString().slice(0, 10),
    end: trafficRange.end.toISOString().slice(0, 10),
    filters: { link: String(slug), excludeBots },
    pollingInterval: 60_000,
  });

  // A/B Test Variant Performance
  const variantPerf = useVariantPerformance({
    range,
    linkId: isABTestEnabled && linkId ? linkId : undefined,
    enabled: !!isABTestEnabled,
    excludeBots,
  });

  // Derive display data from raw analytics
  const derived = useMemo(() => {
    // One point per calendar day: the viewer's days when the service
    // supports time zones, otherwise UTC days.
    const clicksTimelineData = buildClickTimeline(timeseries.data, range);

    // Daily totals cannot reveal the hour of a click or whether it was a bot.
    const hourlyActivityData = null;
    const traffic = trafficSummary.data?.bot_traffic;
    const botHumanData =
      traffic && Number.isFinite(traffic.human) && Number.isFinite(traffic.bot)
        ? [
            { name: "Human", value: traffic.human, color: "#22c55e" },
            { name: "Bot", value: traffic.bot, color: "#ef4444" },
          ]
        : null;

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

    // Variant Performance Data
    const variantData = variantPerf.data?.variants || undefined;

    // Build Variant Map (ID -> Name/URL)
    const variantMap: VariantLabels = {
      control: { name: getVariantName("control") },
    };
    if (url?.abVariants) {
      url.abVariants.forEach((v: { url: string }, i: number) => {
        const variantId = `variant_${i}`;
        variantMap[variantId] = { name: getVariantName(variantId), url: v.url };
      });
    }

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
      variantData,
      variantMap,
    };
  }, [
    timeseries.data,
    browsers.data,
    countries.data,
    devices.data,
    os.data,
    referers.data,
    trafficSummary.data,
    variantPerf.data,
    range,
    url,
  ]);

  const isAnalyticsLoading =
    timeseries.isLoading ||
    browsers.isLoading ||
    devices.isLoading ||
    os.isLoading ||
    countries.isLoading ||
    referers.isLoading ||
    trafficSummary.isLoading ||
    variantPerf.isLoading;

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
    // The hosted image encodes this link's short URL, never its destination.
    const anchor = document.createElement("a");
    anchor.href = `/api/qr/${encodeURIComponent(String(slug))}?format=png`;
    anchor.download = `${slug}-qr.png`;
    anchor.click();
  };

  const handleDelete = async () => {
    await deleteUrl({ urlSlug: slug });
    navigate("/dashboard");
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
        excludeBots={excludeBots}
        onExcludeBotsChange={setExcludeBots}
        totalClickCounts={analyticsData?.totalClickCounts || 0}
        qrEnabled={url?.qrEnabled}
        expiresAt={url?.expiresAt}
        creationTime={url?._creationTime}
        onDownloadQR={url?.qrEnabled ? handleDownloadQR : undefined}
      />

      {/* Tabbed Navigation */}
      <Tabs defaultValue="analytics">
        {/* Phones: five equal columns with the icon above the label, so every
            tab fits without scrolling. */}
        <TabsList
          variant="line"
          size="md"
          className="mb-6 grid w-full grid-cols-5 gap-0 sm:flex sm:w-auto sm:gap-8"
        >
          <TabsTrigger value="analytics" className={linkTabClassName}>
            <GraphUp className="size-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="activity" className={linkTabClassName}>
            <List className="size-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="notes" className={linkTabClassName}>
            <Bookmark className="size-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="health" className={linkTabClassName}>
            <ShieldCheck className="size-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="settings" className={linkTabClassName}>
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsSection
            clicksTimelineData={derived.clicksTimelineData}
            browserData={derived.browserData}
            countryData={derived.countryData}
            deviceData={derived.deviceData}
            osData={derived.osData}
            botHumanData={derived.botHumanData}
            // latencyBuckets={derived.latencyBuckets}
            hourlyActivityData={derived.hourlyActivityData}
            referrerData={derived.referrerData}
            variantData={derived.variantData}
            variantMap={derived.variantMap}
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
          <LinkActivityLog linkSlug={String(slug)} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <LinkNotesPanel shortUrl={shortUrl} fullUrl={url?.fullurl || ""} />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health">
          <LinkHealthPanel urlId={url?._id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

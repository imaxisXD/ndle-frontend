"use client";

import { useMemo, useState, useEffect, type ElementType } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyticsV2 } from "@/hooks/useAnalyticsV2";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CountryChart } from "@/components/charts/country-chart";
import { ReferrerChart } from "@/components/charts/referrer-chart";
import { ClicksChart } from "@/components/charts/clicks-chart";
import NumberFlow from "@number-flow/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@/convex/_generated/api";
import { TopLinksChart } from "@/components/charts/top-links-chart";
import { FilterBar } from "@/components/filter-bar";
import {
  CursorClickIcon,
  LinkIcon,
} from "@phosphor-icons/react";
import { UTMAnalyticsPanel } from "@/components/UTMAnalyticsPanel";
import type { UTMAnalyticsData } from "@/types/utm-analytics";
import { AgenticChartChat } from "@/components/agentic-charts";
import { EmptyStateImage } from "@/components/empty-state-image";

const freeTimeRangeOptions = [
  {
    value: "24h",
    label: "Last 24 hours",
    displayValue: "Last 24 hours",
  },
  { value: "7d", label: "Last 7 days", displayValue: "Last 7 days" },
  {
    value: "30d",
    label: "Last 30 days",
    displayValue: "Last 30 days",
  },
] satisfies Array<{ value: string; label: string; displayValue: string }>;

const defaultFilterOptions = {
  country: [{ value: "all", label: "All Countries" }],
  device: [{ value: "all", label: "All Devices" }],
  browser: [{ value: "all", label: "All Browsers" }],
  os: [{ value: "all", label: "All OS" }],
  link: [{ value: "all", label: "All Links" }],
} satisfies Record<string, Array<{ value: string; label: string }>>;

function TotalClicksCard() {
  const totalClicksFromConvex = useQuery(api.urlAnalytics.getUsersTotalClicks);
  const totalClicks = totalClicksFromConvex;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground text-xs">
              Clicks on Active Links
            </p>
            <div className="mt-2 text-2xl font-medium">
              {totalClicks == null ? <Skeleton className="h-8 w-16" /> : <NumberFlow value={totalClicks} />}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">Real-time</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <CursorClickIcon className="text-muted-foreground h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewStatCard({
  label,
  value,
  change,
  Icon,
  showSkeleton,
}: {
  label: string;
  value: number;
  change: string;
  Icon: ElementType<{ className?: string }>;
  showSkeleton: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground text-xs">{label}</p>
            <div className="mt-2 text-2xl font-medium">
              {showSkeleton ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <NumberFlow value={value} />
              )}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">{change}</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <Icon className="text-muted-foreground h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsOverviewCards({
  showSkeleton,
}: {
  showSkeleton: boolean;
}) {
  const linkCount = useQuery(api.urlAnalytics.getUsersLinkCount);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <OverviewStatCard label="Total Links" value={linkCount ?? 0} change="Active links in your account"
        Icon={LinkIcon} showSkeleton={showSkeleton || linkCount == null} />
      <TotalClicksCard />
    </div>
  );
}

export function Analytics() {
  const viewer = useQuery(api.users.getViewerState);
  const isPro = viewer?.membership === "pro";
  const isDevMode = process.env.NODE_ENV === "development";
  const canUseAiChartBuilder = isDevMode && isPro;
  // Filter state
  const [timeRange, setTimeRange] = useState("30d");
  const [countryFilter, setCountryFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [browserFilter, setBrowserFilter] = useState("all");
  const [osFilter, setOSFilter] = useState("all");
  const [linkFilter, setLinkFilter] = useState("all");

  // Calculate start/end dates based on time range selection
  const { start, end } = useMemo(() => {
    const now = new Date();
    const end = endOfDay(now);
    let start = startOfDay(subDays(now, 29)); // Default: inclusive 30-day window

    switch (timeRange) {
      case "24h":
        start = startOfDay(now);
        break;
      case "7d":
        start = startOfDay(subDays(now, 6));
        break;
      case "30d":
        start = startOfDay(subDays(now, 29));
        break;
      case "3m":
        start = startOfDay(subDays(now, 89));
        break;
      case "12m":
        start = startOfDay(subDays(now, 364));
        break;
      case "mtd":
        start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        break;
      case "qtd": {
        const quarter = Math.floor(now.getMonth() / 3);
        start = startOfDay(new Date(now.getFullYear(), quarter * 3, 1));
        break;
      }
      case "ytd":
        start = startOfDay(new Date(now.getFullYear(), 0, 1));
        break;
      case "all":
        start = startOfDay(new Date(2020, 0, 1));
        break;
    }

    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  }, [timeRange]);

  // Fetch V2 API data - pre-aggregated from server
  const {
    data: serverData,
    isPending,
    isError,
    error,
  } = useAnalyticsV2({
    start,
    end,
    filters: { country: countryFilter, device: deviceFilter, browser: browserFilter, os: osFilter, link: linkFilter },
    pollingInterval: 10000,
  });

  const showSkeleton = isPending && !serverData;
  const analyticsData = serverData ?? null;
  const isLoading = showSkeleton;
  const topSlugs = useMemo(() => Object.entries(analyticsData?.linkCounts ?? {})
    .sort(([, left], [, right]) => right - left).slice(0, 5).map(([slug]) => slug), [analyticsData?.linkCounts]);
  const topLinkDetails = useQuery(api.urlMainFuction.getLinkDetailsBySlugs, { slugs: topSlugs });
  const urlsLoading = showSkeleton || topLinkDetails === undefined;

  const utmData: UTMAnalyticsData | null = analyticsData
    ? {
        sourceData: Object.entries(analyticsData.utmSourceCounts || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([source, clicks]) => ({ source, clicks })),
        mediumData: Object.entries(analyticsData.utmMediumCounts || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([medium, clicks]) => ({ medium, clicks })),
        campaignData: Object.entries(analyticsData.utmCampaignCounts || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([campaign, clicks]) => ({ campaign, clicks })),
        termData: Object.entries(analyticsData.utmTermCounts || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([term, clicks]) => ({ term, clicks })),
        contentData: Object.entries(analyticsData.utmContentCounts || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([content, clicks]) => ({ content, clicks })),
        sourceMediaMatrix: Object.entries(analyticsData.utmMatrixCounts || {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, 50)
          .map(([key, clicks]) => {
            const [source, medium] = key.split("|");
            return { source, medium, clicks };
          }),
        utmCoverage: {
          withUtm: analyticsData.utmWithCount,
          withoutUtm: analyticsData.utmWithoutCount,
        },
        totalUtmClicks: analyticsData.utmWithCount,
      }
    : null;

  // Get filter options from data
  const filterOptions = analyticsData?.filterOptions ?? defaultFilterOptions;

  const timeRangeOptions = isPro ? undefined : freeTimeRangeOptions;

  useEffect(() => {
    if (isPro) {
      return;
    }

    if (!["24h", "7d", "30d"].includes(timeRange)) {
      setTimeRange("30d");
    }
  }, [isPro, timeRange]);

  // Clicks by day of week for the chart
  const clicksData = useMemo(() => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grouped: Record<string, number> = {};

    daysOfWeek.forEach((day) => {
      grouped[day] = 0;
    });

    if (analyticsData?.clicksByDay) {
      Object.entries(analyticsData.clicksByDay || {}).forEach(
        ([dayStr, count]) => {
          const date = new Date(dayStr).toLocaleDateString("en-US", {
            weekday: "short",
            timeZone: "UTC",
          });

          if (grouped[date] !== undefined) {
            grouped[date] = (grouped[date] || 0) + count;
          }
        },
      );
    }

    return daysOfWeek.map((day) => ({ day, clicks: grouped[day] }));
  }, [analyticsData?.clicksByDay]);

  // Top Countries
  const topCountries = useMemo(() => {
    if (!analyticsData?.countryCounts) return [];

    const total = Object.values(analyticsData.countryCounts).reduce(
      (sum, c) => sum + c,
      0,
    );

    return Object.entries(analyticsData.countryCounts || {})
      .sort(([, a], [, b]) => b - a)
      .map(([country, clicks]) => ({
        country,
        clicks,
        percentage: total > 0 ? Math.round((clicks / total) * 100) : 0,
      }));
  }, [analyticsData?.countryCounts]);

  const topLinks = useMemo(() => topSlugs.map(slug => {
    const detail = topLinkDetails?.find(url => url.slugAssigned === slug || url.shortUrl === slug);
    return { url: slug, originalUrl: detail?.fullurl ?? "Deleted link", clicks: analyticsData?.linkCounts[slug] ?? 0,
      change: "", createdAt: detail?._creationTime ?? 0, customDomain: detail?.customDomain ?? null };
  }), [topSlugs, topLinkDetails, analyticsData?.linkCounts]);

  if (isError) {
    console.error("Analytics failed to load:", error);

    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <EmptyStateImage
          alt=""
          className="mb-5 w-full max-w-[680px]"
          name="errorAnalytics"
        />
        <h3 className="text-foreground text-sm font-medium">
          Analytics could not load
        </h3>
        <p className="text-muted-foreground mt-2 max-w-md text-xs">
          Try refreshing the page. Your links are safe.
        </p>
      </div>
    );
  }

  const chartAiLockMessage = !isDevMode
    ? "This works only in dev mode right now."
    : "This is locked for free users. Use a Pro account in dev mode.";

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <FilterBar
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        timeRangeOptions={timeRangeOptions}
        linkFilter={linkFilter}
        onLinkFilterChange={setLinkFilter}
        linkOptions={filterOptions.link}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        countryOptions={filterOptions.country}
        deviceFilter={deviceFilter}
        onDeviceFilterChange={setDeviceFilter}
        deviceOptions={filterOptions.device}
        browserFilter={browserFilter}
        onBrowserFilterChange={setBrowserFilter}
        browserOptions={filterOptions.browser}
        osFilter={osFilter}
        onOSFilterChange={setOSFilter}
        osOptions={filterOptions.os}
      />

      {serverData && <p className="text-muted-foreground text-xs">
        {serverData.meta.coverage?.complete ? "Includes recent and archived clicks." : "Analytics coverage is being checked."}
        {serverData.meta.freshness?.lastCommittedAt ? ` Last received ${new Date(serverData.meta.freshness.lastCommittedAt).toLocaleString()}.` : ""}
      </p>}

      {/* Stats Grid */}
      <AnalyticsOverviewCards showSkeleton={showSkeleton} />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClicksChart data={clicksData} isLoading={isLoading} />
        <CountryChart data={topCountries} isLoading={isLoading} />
        <ReferrerChart
          data={
            analyticsData?.refererCounts
              ? Object.entries(analyticsData.refererCounts)
                  .map(([domain, clicks]) => ({
                    domain,
                    clicks: Number(clicks),
                  }))
                  .sort((a, b) => b.clicks - a.clicks)
              : []
          }
          isLoading={isLoading}
        />
      </div>

      {/* Top Performing Links */}
      <TopLinksChart data={topLinks} isLoading={urlsLoading} />

      {/* UTM Campaign Analytics */}
      <div>
        <h3 className="mb-4 text-lg font-medium">Campaign Analytics</h3>
        <p className="text-muted-foreground mb-6 text-sm">
          Track performance of your UTM-tagged marketing campaigns
        </p>
        <UTMAnalyticsPanel data={utmData} isLoading={isLoading} />
      </div>

      {/* AI Chart Generation Chat */}
      <div className="mt-8">
        {canUseAiChartBuilder ? (
          <AgenticChartChat />
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-base font-medium">Ask AI to Create Charts</p>
                <p className="text-muted-foreground text-sm">
                  {chartAiLockMessage}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

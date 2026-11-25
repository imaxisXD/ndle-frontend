"use client";

import {
  lazy,
  Suspense,
  useMemo,
  useState,
  useEffect,
  type ElementType,
} from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyticsV2 } from "@/hooks/useAnalyticsV2";
import { getAnalyticsDateWindow } from "@/lib/analytics-date-window";
import { Skeleton } from "@/components/ui/skeleton";
import { CountryChart } from "@/components/charts/country-chart";
import { ReferrerChart } from "@/components/charts/referrer-chart";
import { ClicksChart } from "@/components/charts/clicks-chart";
import NumberFlow from "@number-flow/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@/convex/_generated/api";
import { TopLinksChart } from "@/components/charts/top-links-chart";
import {
  DEFAULT_ANALYTICS_FILTERS,
  FilterBar,
  FREE_TIME_RANGE_OPTIONS,
  type AnalyticsFilterState,
} from "@/components/filter-bar";
import { CursorClickIcon, LinkIcon } from "@phosphor-icons/react";
import { UTMAnalyticsPanel } from "@/components/UTMAnalyticsPanel";
import type { UTMAnalyticsData } from "@/types/utm-analytics";
import { EmptyStateImage } from "@/components/empty-state-image";
import { getAnalyticsTopLinks } from "@/lib/analytics-top-links";

const AgenticChartChat = lazy(() =>
  import("@/components/agentic-charts").then((m) => ({
    default: m.AgenticChartChat,
  })),
);

const defaultFilterOptions = {
  country: [{ value: "all", label: "All Countries" }],
  device: [{ value: "all", label: "All Devices" }],
  browser: [{ value: "all", label: "All Browsers" }],
  os: [{ value: "all", label: "All OS" }],
  link: [{ value: "all", label: "All Links" }],
};

function TotalClicksCard() {
  const totalClicks = useQuery(api.urlAnalytics.getUsersTotalClicks);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground text-xs">
              Clicks on Active Links
            </p>
            <div className="mt-2 text-2xl font-medium">
              {totalClicks == null ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <NumberFlow value={totalClicks} />
              )}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">Real-time</div>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <CursorClickIcon
              className="text-muted-foreground h-5 w-5"
              aria-hidden="true"
            />
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
            <Icon className="text-muted-foreground h-5 w-5" aria-hidden="true" />
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
      <OverviewStatCard
        label="Total Links"
        value={linkCount ?? 0}
        change="Active links in your account"
        Icon={LinkIcon}
        showSkeleton={showSkeleton || linkCount == null}
      />
      <TotalClicksCard />
    </div>
  );
}

export function Analytics() {
  const viewer = useQuery(api.users.getViewerState);
  const isPro = viewer?.membership === "pro";
  const isDevMode = process.env.NODE_ENV === "development";
  const canUseAiChartBuilder = isDevMode && isPro;

  const [filters, setFilters] = useState<AnalyticsFilterState>(
    DEFAULT_ANALYTICS_FILTERS,
  );

  const { start, end } = getAnalyticsDateWindow(filters.timeRange);

  const {
    data: serverData,
    isPending,
    isError,
    error,
  } = useAnalyticsV2({
    start,
    end,
    filters: {
      country: filters.country,
      device: filters.device,
      browser: filters.browser,
      os: filters.os,
      link: filters.link,
      excludeBots: filters.excludeBots,
    },
    pollingInterval: 10000,
  });

  const showSkeleton = isPending && !serverData;
  const analyticsData = serverData ?? null;
  const isLoading = showSkeleton;
  const topSlugs = useMemo(
    () =>
      getAnalyticsTopLinks(analyticsData?.linkCounts ?? {}).map(
        (link) => link.url,
      ),
    [analyticsData?.linkCounts],
  );
  const topLinkDetails = useQuery(
    api.urlMainFuction.getLinkDetailsBySlugs,
    topSlugs.length > 0 ? { slugs: topSlugs } : "skip",
  );
  const urlsLoading =
    showSkeleton || (topSlugs.length > 0 && topLinkDetails === undefined);

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

  const filterOptions = analyticsData?.filterOptions ?? defaultFilterOptions;
  const timeRangeOptions = isPro ? undefined : FREE_TIME_RANGE_OPTIONS;

  useEffect(() => {
    if (isPro) return;
    if (!["24h", "7d", "30d"].includes(filters.timeRange)) {
      setFilters((prev) => ({ ...prev, timeRange: "30d" }));
    }
  }, [isPro, filters.timeRange]);

  const clicksData = useMemo(() => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grouped: Record<string, number> = {};
    for (const day of daysOfWeek) grouped[day] = 0;

    if (analyticsData?.clicksByDay) {
      for (const [dayStr, count] of Object.entries(analyticsData.clicksByDay)) {
        const weekday = new Date(dayStr).toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC",
        });
        if (grouped[weekday] !== undefined) {
          grouped[weekday] += count;
        }
      }
    }

    return daysOfWeek.map((day) => ({ day, clicks: grouped[day] }));
  }, [analyticsData?.clicksByDay]);

  const topCountries = useMemo(() => {
    if (!analyticsData?.countryCounts) return [];
    return Object.entries(analyticsData.countryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([country, clicks]) => ({ country, clicks }));
  }, [analyticsData?.countryCounts]);

  const topReferrers = useMemo(() => {
    if (!analyticsData?.refererCounts) return [];
    return Object.entries(analyticsData.refererCounts)
      .map(([domain, clicks]) => ({ domain, clicks: Number(clicks) }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [analyticsData?.refererCounts]);

  const topLinks = useMemo(
    () =>
      getAnalyticsTopLinks(analyticsData?.linkCounts ?? {}, topLinkDetails ?? []),
    [topLinkDetails, analyticsData?.linkCounts],
  );

  const filterBar = (
    <FilterBar
      filters={filters}
      onFiltersChange={setFilters}
      options={filterOptions}
      timeRangeOptions={timeRangeOptions}
    />
  );

  if (isError) {
    console.error("Analytics failed to load:", error);

    return (
      <div className="space-y-6">
        {filterBar}
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
            Try another date range or refresh the page. Your links are safe.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {filterBar}

      {/* Stats Grid */}
      <AnalyticsOverviewCards showSkeleton={showSkeleton} />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClicksChart data={clicksData} isLoading={isLoading} />
        <CountryChart data={topCountries} isLoading={isLoading} />
        <ReferrerChart data={topReferrers} isLoading={isLoading} />
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

      {/* AI Chart Generation Chat — lazy-loaded in development only */}
      {canUseAiChartBuilder ? (
        <div className="mt-8">
          <Suspense
            fallback={
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            }
          >
            <AgenticChartChat />
          </Suspense>
        </div>
      ) : isDevMode ? (
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                <p className="text-base font-medium">Ask AI to Create Charts</p>
                <p className="text-muted-foreground text-sm">
                  This is locked for free users. Use a Pro account in dev mode.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

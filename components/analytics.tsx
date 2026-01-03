"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAnalyticsV2 } from "@/hooks/useAnalyticsV2";
import { useColdAnalytics } from "@/hooks/use-cold-analytics";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CountryChart } from "@/components/charts/country-chart";
import { ClicksChart } from "@/components/charts/clicks-chart";
import NumberFlow from "@number-flow/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@/convex/_generated/api";
import { TopLinksChart } from "@/components/charts/top-links-chart";
import { FilterBar } from "@/components/filter-bar";
import {
  CursorClickIcon,
  LinkIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import { UTMAnalyticsPanel } from "@/components/UTMAnalyticsPanel";
import type { UTMAnalyticsData } from "@/types/utm-analytics";

function TotalClicksCard() {
  const totalClicksFromConvex = useQuery(api.urlAnalytics.getUsersTotalClicks);
  const totalClicks = totalClicksFromConvex ?? 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground text-xs">
              Total Clicks (All Time)
            </p>
            <div className="mt-2 text-2xl font-medium">
              <NumberFlow value={totalClicks} />
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

export function Analytics() {
  // Filter state
  const [timeRange, setTimeRange] = useState("30d");
  const [countryFilter, setCountryFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [browserFilter, setBrowserFilter] = useState("all");
  const [osFilter, setOSFilter] = useState("all");
  const [linkFilter, setLinkFilter] = useState("all");

  // Check if any dimension filter is active
  const hasActiveFilters =
    countryFilter !== "all" ||
    deviceFilter !== "all" ||
    browserFilter !== "all" ||
    osFilter !== "all" ||
    linkFilter !== "all";

  // Calculate start/end dates based on time range selection
  const { start, end } = useMemo(() => {
    const now = new Date();
    const end = endOfDay(now);
    let start = startOfDay(subDays(now, 30)); // Default

    switch (timeRange) {
      case "24h":
        start = startOfDay(subDays(now, 1));
        break;
      case "7d":
        start = startOfDay(subDays(now, 7));
        break;
      case "30d":
        start = startOfDay(subDays(now, 30));
        break;
      case "3m":
        start = startOfDay(subDays(now, 90));
        break;
      case "12m":
        start = startOfDay(subDays(now, 365));
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
    pollingInterval: 10000,
  });

  // DuckDB-WASM for complex queries when filters are active
  // Loads cold parquet files for client-side SQL processing
  const {
    data: coldData,
    loading: coldLoading,
    error: coldError,
  } = useColdAnalytics(
    serverData?.cold || [],
    {
      country: countryFilter,
      device: deviceFilter,
      browser: browserFilter,
      os: osFilter,
      link: linkFilter,
    },
    start,
    end,
    -new Date().getTimezoneOffset(),
  );

  // Only show skeleton on FIRST load
  const showSkeleton = isPending && !serverData;

  // Progressive data loading:
  // 1. Show server data immediately (pre-aggregated)
  // 2. If filters active and cold files exist, use WASM-processed data
  const analyticsData = useMemo(() => {
    // If filters are active and cold data is complete, use it
    if (hasActiveFilters && coldData && !coldData.isPartialData) {
      return coldData;
    }
    // Default: use server pre-aggregated data
    if (serverData) {
      return {
        clicksByDay: serverData.clicksByDay,
        countryCounts: serverData.countryCounts,
        linkCounts: serverData.linkCounts,
        totalClicks: serverData.totalClicks,
        filterOptions: serverData.filterOptions,
        utmSourceCounts: serverData.utmSourceCounts,
        utmMediumCounts: serverData.utmMediumCounts,
        utmCampaignCounts: serverData.utmCampaignCounts,
        utmTermCounts: serverData.utmTermCounts,
        utmContentCounts: serverData.utmContentCounts,
        utmMatrixCounts: serverData.utmMatrixCounts,
        utmWithCount: serverData.utmWithCount,
        utmWithoutCount: serverData.utmWithoutCount,
        isPartialData: false,
      };
    }
    return null;
  }, [serverData, coldData, hasActiveFilters]);

  // Loading state
  const isLoading =
    showSkeleton || (hasActiveFilters && coldLoading && !coldData);

  // Development logging
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (serverData) {
      console.log(`[Analytics] Server data:`, {
        totalClicks: serverData.totalClicks,
        coldFiles: serverData.cold?.length ?? 0,
      });
    }
    if (coldData && hasActiveFilters) {
      console.log(`[Analytics] WASM data (filtered):`, {
        totalClicks: coldData.totalClicks,
      });
    }
  }, [serverData, coldData, hasActiveFilters]);

  // Fetch URLs with analytics from Convex for Top Links
  const urlsWithAnalytics = useQuery(
    api.urlMainFuction.getUserUrlsWithAnalytics,
  );
  const urlsLoading = urlsWithAnalytics === undefined;

  // Derive UTM panel data
  const utmData: UTMAnalyticsData | null = analyticsData
    ? {
        sourceData: Object.entries(analyticsData.utmSourceCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([source, clicks]) => ({ source, clicks })),
        mediumData: Object.entries(analyticsData.utmMediumCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([medium, clicks]) => ({ medium, clicks })),
        campaignData: Object.entries(analyticsData.utmCampaignCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([campaign, clicks]) => ({ campaign, clicks })),
        termData: Object.entries(analyticsData.utmTermCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([term, clicks]) => ({ term, clicks })),
        contentData: Object.entries(analyticsData.utmContentCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([content, clicks]) => ({ content, clicks })),
        sourceMediaMatrix: Object.entries(analyticsData.utmMatrixCounts)
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
  const filterOptions = analyticsData?.filterOptions ?? {
    country: [{ value: "all", label: "All Countries" }],
    device: [{ value: "all", label: "All Devices" }],
    browser: [{ value: "all", label: "All Browsers" }],
    os: [{ value: "all", label: "All OS" }],
    link: [{ value: "all", label: "All Links" }],
  };

  // Clicks by day of week for the chart
  const clicksData = useMemo(() => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grouped: Record<string, number> = {};

    daysOfWeek.forEach((day) => {
      grouped[day] = 0;
    });

    if (analyticsData?.clicksByDay) {
      Object.entries(analyticsData.clicksByDay).forEach(([dayStr, count]) => {
        const date = new Date(dayStr).toLocaleDateString("en-US", {
          weekday: "short",
          timeZone: "UTC",
        });

        if (grouped[date] !== undefined) {
          grouped[date] = (grouped[date] || 0) + count;
        }
      });
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

    return Object.entries(analyticsData.countryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([country, clicks]) => ({
        country,
        clicks,
        percentage: total > 0 ? Math.round((clicks / total) * 100) : 0,
      }));
  }, [analyticsData?.countryCounts]);

  // Top Links from Convex
  const topLinks = useMemo(() => {
    if (!urlsWithAnalytics) return [];
    return urlsWithAnalytics
      .filter(
        (url) => url.slugAssigned && (url.analytics?.totalClickCounts ?? 0) > 0,
      )
      .sort(
        (a, b) =>
          (b.analytics?.totalClickCounts ?? 0) -
          (a.analytics?.totalClickCounts ?? 0),
      )
      .slice(0, 5)
      .map((url) => ({
        url: url.slugAssigned as string,
        originalUrl: url.fullurl,
        clicks: url.analytics?.totalClickCounts ?? 0,
        change: "0%",
        createdAt: url._creationTime,
        customDomain: url.customDomain ?? null,
      }));
  }, [urlsWithAnalytics]);

  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-red-500">
        Error loading analytics: {error?.message}
      </div>
    );
  }

  if (coldError) {
    console.error("Cold analytics error:", coldError);
  }

  const stats = [
    {
      label: "Total Links",
      value: "24",
      icon: LinkIcon,
      change: "[+3] this week",
      trend: "up",
    },
    {
      label: "Auto-Healed",
      value: "8",
      icon: ShieldCheckIcon,
      change: "[3] active",
      trend: "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <FilterBar
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                  <div className="mt-2 text-2xl font-medium">
                    {showSkeleton ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <NumberFlow value={Number(stat.value)} />
                    )}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {stat.change}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <stat.icon className="text-muted-foreground h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <TotalClicksCard />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClicksChart data={clicksData} isLoading={isLoading} />
        <CountryChart data={topCountries} isLoading={isLoading} />
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

      {/* Healing Activity - STATIC FOR NOW */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-base font-medium">Healing Activity</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Self-healing link statistics
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Successfully Healed
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    Links automatically fixed
                  </p>
                </div>
                <p className="text-2xl font-medium text-green-900">8</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Currently Checking
                  </p>
                  <p className="mt-1 text-xs text-yellow-700">
                    Links being monitored
                  </p>
                </div>
                <p className="text-2xl font-medium text-yellow-900">3</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Archived Backups
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Wayback Machine saves
                  </p>
                </div>
                <p className="text-2xl font-medium text-blue-900">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-base font-medium">AI Usage</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                AI-powered features activity
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-background border-border flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Summaries Generated</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    AI content summaries
                  </p>
                </div>
                <p className="text-2xl font-medium">24</p>
              </div>

              <div className="bg-background border-border flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Chat Conversations</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    AI chat interactions
                  </p>
                </div>
                <p className="text-2xl font-medium">45</p>
              </div>

              <div className="bg-background border-border flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Memory Entries</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Saved context & notes
                  </p>
                </div>
                <p className="text-2xl font-medium">18</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

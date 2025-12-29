"use client";

import { useMemo, useState } from "react";
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
        start = startOfDay(new Date(2020, 0, 1)); // Far back date
        break;
    }

    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  }, [timeRange]);

  // Fetch Data with Polling - user identity determined server-side from JWT claims
  const { data, isPending, isError, error } = useAnalyticsV2({
    start,
    end,
    pollingInterval: 10000,
  });

  // Only show skeleton on FIRST load, not when switching filters (keepPreviousData handles that)
  const showSkeleton = isPending && !data;

  const {
    data: coldData,
    loading: coldLoading,
    error: coldError,
  } = useColdAnalytics(data?.cold || [], {
    country: countryFilter,
    device: deviceFilter,
    browser: browserFilter,
    os: osFilter,
    link: linkFilter,
  });

  // Fetch URLs with analytics from Convex for Top Links
  const urlsWithAnalytics = useQuery(
    api.urlMainFuction.getUserUrlsWithAnalytics,
  );
  const urlsLoading = urlsWithAnalytics === undefined;

  console.log(
    `[Analytics] showSkeleton=${showSkeleton} | isPending=${isPending} | coldLoading=${coldLoading}`,
  );
  console.log("Analytics data", data);
  console.log("Cold data", coldData);

  // Get filter options directly from coldData (keyed by filter id)
  const defaultFilterOptions: Record<
    string,
    Array<{ value: string; label: string }>
  > = {
    country: [{ value: "all", label: "All Countries" }],
    device: [{ value: "all", label: "All Devices" }],
    browser: [{ value: "all", label: "All Browsers" }],
    os: [{ value: "all", label: "All OS" }],
    link: [{ value: "all", label: "All Links" }],
  };
  const filterOptions = coldData?.filterOptions ?? defaultFilterOptions;

  // Example: Grouping by Day for the Chart
  const clicksData = useMemo(() => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const grouped: Record<string, number> = {};

    // Initialize all days with 0
    daysOfWeek.forEach((day) => {
      grouped[day] = 0;
    });

    // Start with hot data
    if (data?.hot) {
      data.hot.forEach((row) => {
        const date = new Date(row.occurred_at).toLocaleDateString("en-US", {
          weekday: "short",
        });
        if (grouped[date] !== undefined) {
          grouped[date] += 1;
        }
      });
    }

    // Merge cold data
    if (coldData?.clicksByDay) {
      Object.entries(coldData.clicksByDay).forEach(([dayStr, count]) => {
        const date = new Date(dayStr).toLocaleDateString("en-US", {
          weekday: "short",
        });
        if (grouped[date] !== undefined) {
          grouped[date] += count;
        }
      });
    }

    return daysOfWeek.map((day) => ({ day, clicks: grouped[day] }));
  }, [data?.hot, coldData?.clicksByDay]);

  // Example: Top Countries (Calculated for stats)
  const topCountries = useMemo(() => {
    const counts: Record<string, number> = {};

    // Hot
    if (data?.hot) {
      data.hot.forEach((row) => {
        const country = row.country || "Unknown";
        counts[country] = (counts[country] || 0) + 1;
      });
    }

    // Cold
    if (coldData?.countryCounts) {
      Object.entries(coldData.countryCounts).forEach(([country, count]) => {
        counts[country] = (counts[country] || 0) + count;
      });
    }

    // Calculate total from counts for percentage calculation
    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([country, clicks]) => ({
        country,
        clicks,
        percentage: total > 0 ? Math.round((clicks / total) * 100) : 0,
      }));
  }, [data?.hot, coldData?.countryCounts]);

  // Top Links from Convex (source of truth for click counts)
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
    // eslint-disable-next-line @tanstack/query/no-unstable-deps
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
    // We don't block the whole UI, but we can show a toast or partial error state if needed.
    // For now, we'll let the user know in the "Archived Files" card or via a subtle alert.
  }

  const stats = [
    {
      label: "Total Links",
      value: "24", // Static for now, or fetch from another API
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
        linkOptions={filterOptions["link"]}
        countryFilter={countryFilter}
        onCountryFilterChange={setCountryFilter}
        countryOptions={filterOptions["country"]}
        deviceFilter={deviceFilter}
        onDeviceFilterChange={setDeviceFilter}
        deviceOptions={filterOptions["device"]}
        browserFilter={browserFilter}
        onBrowserFilterChange={setBrowserFilter}
        browserOptions={filterOptions["browser"]}
        osFilter={osFilter}
        onOSFilterChange={setOSFilter}
        osOptions={filterOptions["os"]}
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
        {/* Total Clicks - separate component with its own Convex data */}
        <TotalClicksCard />
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClicksChart
          data={clicksData}
          isLoading={showSkeleton || (coldLoading && !coldData)}
        />

        {/* Top Countries */}
        <CountryChart
          data={topCountries}
          isLoading={showSkeleton || (coldLoading && !coldData)}
        />
      </div>

      {/* Top Performing Links */}
      <TopLinksChart data={topLinks} isLoading={urlsLoading} />

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

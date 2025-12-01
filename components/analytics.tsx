"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/base-select";
import {
  Archive,
  CursorPointer,
  Globe,
  MagicWand,
  ShieldCheck,
  StatsDownSquare,
  RefreshDouble,
} from "iconoir-react";
import { useAnalyticsV2 } from "@/hooks/useAnalyticsV2";
import { useColdAnalytics } from "@/hooks/use-cold-analytics";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressListItem } from "@/components/analytics/ProgressListItem";
import { CountryChart } from "@/components/charts/country-chart";
import NumberFlow from "@number-flow/react";

type TimeRange = "7d" | "30d" | "90d" | "1y";

export function Analytics({ userId }: { userId: string }) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  // Calculate start/end dates based on selection
  const { start, end } = useMemo(() => {
    const now = new Date();
    const end = endOfDay(now);
    let start = startOfDay(subDays(now, 30)); // Default

    switch (timeRange) {
      case "7d":
        start = startOfDay(subDays(now, 7));
        break;
      case "30d":
        start = startOfDay(subDays(now, 30));
        break;
      case "90d":
        start = startOfDay(subDays(now, 90));
        break;
      case "1y":
        start = startOfDay(subDays(now, 365));
        break;
    }

    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(end, "yyyy-MM-dd"),
    };
  }, [timeRange]);

  // Fetch Data with Polling (10s), passing the user ID
  console.log("Fetching analytics data for user", userId);
  const { data, isLoading, isError, error } = useAnalyticsV2({
    start,
    end,
    userId,
    pollingInterval: 10000,
  });

  const {
    data: coldData,
    loading: coldLoading,
    error: coldError,
  } = useColdAnalytics(data?.cold || []);

  console.log("Analytics data", data);
  console.log("Cold data", coldData);

  // --- Derived Stats (from API Data + Cold Data) ---

  const totalHotClicks = data?.meta.hot_count ?? 0;
  const totalColdClicks = coldData?.totalClicks ?? 0;
  const totalClicks = totalHotClicks + totalColdClicks;

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

  const maxClicks =
    clicksData.length > 0 ? Math.max(...clicksData.map((d) => d.clicks)) : 0;

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

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([country, clicks]) => ({
        country,
        clicks,
        percentage:
          totalClicks > 0 ? Math.round((clicks / totalClicks) * 100) : 0,
      }));
  }, [data?.hot, coldData?.countryCounts, totalClicks]);

  // Example: Top Links
  const topLinks = useMemo(() => {
    const counts: Record<string, number> = {};

    // Hot
    if (data?.hot) {
      data.hot.forEach((row) => {
        const url = row.short_url || row.link_slug; // Fallback
        counts[url] = (counts[url] || 0) + 1;
      });
    }

    // Cold
    if (coldData?.linkCounts) {
      Object.entries(coldData.linkCounts).forEach(([url, count]) => {
        counts[url] = (counts[url] || 0) + count;
      });
    }

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([url, clicks]) => ({
        url,
        clicks,
        change: "0%", // Delta not calculated in this simple view
      }));
  }, [data?.hot, coldData?.linkCounts]);

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
      icon: StatsDownSquare,
      change: "[+3] this week",
      trend: "up",
    },
    {
      label: "Total Clicks (All Time)",
      value: isLoading ? "..." : totalClicks.toLocaleString(),
      icon: CursorPointer,
      change: coldLoading ? (
        <span className="flex items-center gap-1">
          <RefreshDouble className="h-3 w-3 animate-spin" /> Processing archive
        </span>
      ) : (
        "Real-time"
      ),
      trend: "up",
    },
    {
      label: "Auto-Healed",
      value: "8",
      icon: ShieldCheck,
      change: "[3] active",
      trend: "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                  <div className="mt-2 text-2xl font-medium">
                    {isLoading ? (
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
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-medium">
                  Clicks Over Time
                  {(isLoading || coldLoading) && (
                    <RefreshDouble className="text-muted-foreground h-3 w-3 animate-spin" />
                  )}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Activity in selected range
                </p>
              </div>
              <Select
                value={timeRange}
                onValueChange={(value) =>
                  setTimeRange(value as typeof timeRange)
                }
              >
                <SelectTrigger size="sm" className="bg-white shadow-2xl">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : clicksData.length === 0 ? (
              <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
                No clicks recorded in this period.
              </div>
            ) : (
              <div className="space-y-3.5">
                {clicksData.map((data) => (
                  <ProgressListItem
                    key={data.day}
                    label={data.day}
                    value={data.clicks}
                    total={maxClicks}
                  />
                ))}
              </div>
            )}

            {!isLoading && clicksData.length > 0 && (
              <div className="border-border mt-6 border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-xs">
                    Average per day
                  </span>
                  <span className="text-sm font-medium">
                    [
                    {Math.round(
                      clicksData.reduce((sum, d) => sum + d.clicks, 0) /
                        Math.max(clicksData.length, 1),
                    )}
                    ]
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Countries */}
        <CountryChart
          data={topCountries}
          isLoading={isLoading || coldLoading}
        />
      </div>

      {/* Top Performing Links */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-base font-medium">Top Performing Links</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Most clicked links in the selected period
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : topLinks.length === 0 ? (
            <div className="text-muted-foreground flex h-20 items-center justify-center text-sm">
              No link activity found.
            </div>
          ) : (
            <div className="space-y-3">
              {topLinks.map((link, index) => (
                <div
                  key={link.url}
                  className="border-border bg-background hover:bg-muted/30 flex items-center justify-between rounded-lg border p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                      {index + 1}
                    </div>
                    <code className="max-w-[200px] truncate text-sm font-medium md:max-w-md">
                      {link.url}
                    </code>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">{link.clicks}</p>
                      <p className="text-muted-foreground text-xs">clicks</p>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {link.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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

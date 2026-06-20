"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BklitDonutChart,
  BklitHorizontalBarChart,
} from "@/components/charts/bklit-chart-kit";
import { Skeleton } from "@/components/ui/skeleton";
import type { UTMAnalyticsData } from "@/types/utm-analytics";

const COLORS = [
  "var(--chart-line-primary)",
  "var(--chart-line-secondary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

interface UTMAnalyticsPanelProps {
  data: UTMAnalyticsData | null;
  isLoading?: boolean;
}

export function UTMAnalyticsPanel({ data, isLoading }: UTMAnalyticsPanelProps) {
  // Filter out "Direct / None" and "No Campaign" for cleaner charts
  const filteredSourceData = useMemo(() => {
    if (!data?.sourceData) return [];
    return data.sourceData.filter(
      (d) => d.source !== "Direct / None" && d.source !== "None",
    );
  }, [data?.sourceData]);

  const filteredCampaignData = useMemo(() => {
    if (!data?.campaignData) return [];
    return data.campaignData.filter((d) => d.campaign !== "No Campaign");
  }, [data?.campaignData]);

  const filteredMediumData = useMemo(() => {
    if (!data?.mediumData) return [];
    return data.mediumData.filter((d) => d.medium !== "None");
  }, [data?.mediumData]);

  const utmPercentage = useMemo(() => {
    if (!data?.utmCoverage) return 0;
    const total = data.utmCoverage.withUtm + data.utmCoverage.withoutUtm;
    if (total === 0) return 0;
    return Math.round((data.utmCoverage.withUtm / total) * 100);
  }, [data?.utmCoverage]);

  const hasUtmData =
    filteredSourceData.length > 0 ||
    filteredCampaignData.length > 0 ||
    filteredMediumData.length > 0;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasUtmData && data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-blue-50 p-4">
            <svg
              className="h-8 w-8 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold">No Campaign Data Yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Start using UTM parameters when creating short links to track your
            marketing campaigns and see detailed performance analytics here.
          </p>
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-xs text-gray-600">
            <strong>Tip:</strong> Enable &ldquo;UTM Builder&rdquo; in Advanced
            Options when creating a link
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>UTM Tracked Clicks</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {data?.totalUtmClicks?.toLocaleString() ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-xs">
              {utmPercentage}% of all clicks
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Sources</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {filteredSourceData.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-xs">
              {filteredSourceData[0]?.source ?? "—"} is top performer
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Campaigns</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {filteredCampaignData.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-xs">
              {filteredCampaignData[0]?.campaign ?? "—"} is top performer
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Mediums</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {filteredMediumData.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-muted-foreground text-xs">
              {filteredMediumData[0]?.medium ?? "—"} is top performer
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Sources Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Traffic Sources</CardTitle>
            <CardDescription>Clicks by utm_source parameter</CardDescription>
          </CardHeader>
          <CardContent>
            <BklitHorizontalBarChart
              data={filteredSourceData.slice(0, 10)}
              emptyDescription="No source data available"
              emptyTitle="No source data"
              heightClassName="h-[250px]"
              labelKey="source"
              labelWidth={112}
              valueKey="clicks"
            />
          </CardContent>
        </Card>

        {/* Campaign Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign Performance</CardTitle>
            <CardDescription>Clicks by utm_campaign parameter</CardDescription>
          </CardHeader>
          <CardContent>
            <BklitHorizontalBarChart
              data={filteredCampaignData.slice(0, 10)}
              emptyDescription="No campaign data available"
              emptyTitle="No campaign data"
              heightClassName="h-[250px]"
              labelKey="campaign"
              labelWidth={132}
              valueKey="clicks"
            />
          </CardContent>
        </Card>
      </div>

      {/* Medium & Coverage Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Medium Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic by Medium</CardTitle>
            <CardDescription>
              Distribution by utm_medium parameter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BklitDonutChart
              data={filteredMediumData.map((item, index) => ({
                label: item.medium,
                value: item.clicks,
                color: COLORS[index % COLORS.length],
              }))}
              emptyDescription="No medium data available"
              emptyTitle="No medium data"
              heightClassName="h-[250px]"
            />
          </CardContent>
        </Card>

        {/* UTM Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">UTM Tracking Coverage</CardTitle>
            <CardDescription>
              Percentage of clicks with UTM parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[250px] items-center justify-center">
              <div className="text-center">
                <div className="relative inline-flex">
                  <svg className="h-32 w-32" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    {/* Progress circle */}
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray={`${utmPercentage}, 100`}
                      strokeLinecap="round"
                    />
                    <text
                      x="18"
                      y="20.5"
                      textAnchor="middle"
                      className="fill-current text-3xl font-bold"
                    >
                      {utmPercentage}%
                    </text>
                  </svg>
                </div>
                <div className="mt-4 flex justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span>
                      {data?.utmCoverage.withUtm.toLocaleString() ?? 0} with UTM
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-gray-200" />
                    <span>
                      {data?.utmCoverage.withoutUtm.toLocaleString() ?? 0}{" "}
                      without
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source x Medium Matrix */}
      {data?.sourceMediaMatrix && data.sourceMediaMatrix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source × Medium Matrix</CardTitle>
            <CardDescription>
              Top combinations of traffic source and medium
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Medium</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sourceMediaMatrix.slice(0, 10).map((row, index) => {
                  const total = data.totalUtmClicks || 1;
                  const share = Math.round((row.clicks / total) * 100);
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        <Badge
                          variant="default"
                          className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-50"
                        >
                          {row.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="default"
                          className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                        >
                          {row.medium}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.clicks.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="bg-secondary h-2 w-16 overflow-hidden rounded-full">
                            <div
                              className="h-full bg-indigo-500"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="text-muted-foreground w-8 tabular-nums">
                            {share}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

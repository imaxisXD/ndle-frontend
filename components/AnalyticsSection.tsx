"use client";

import { ClicksTimelineChart } from "@/components/charts/clicks-timeline-chart";
import { BrowserChart } from "@/components/charts/browser-chart";
import { CountryChart } from "@/components/charts/country-chart";
import { DeviceOSChart } from "@/components/charts/device-os-chart";
import { BotTrafficChart } from "@/components/charts/bot-traffic-chart";

import { HourlyActivityChart } from "@/components/charts/hourly-activity-chart";
import {
  ReferrerChart,
  type ReferrerData,
} from "@/components/charts/referrer-chart";
import {
  VariantPerformanceChart,
  type VariantLabels,
} from "@/components/charts/variant-performance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyStateImage } from "@/components/empty-state-image";
import type { LinkAnalyticsStatus } from "@/lib/analytics-request";
import { Lock } from "iconoir-react";

export function AnalyticsSection({
  clicksTimelineData,
  browserData,
  countryData,
  deviceData,
  osData,
  botHumanData,
  hourlyActivityData,
  referrerData,
  variantData,
  variantMap,
  isLoading,
  status = "ready",
  onRetry,
  onShowAvailableRange,
}: {
  clicksTimelineData: Array<{ time: string; clicks: number }>;
  browserData: Array<{ month: string; clicks: number }>;
  countryData: Array<{ country: string; clicks: number }>;
  deviceData: Array<{ device: string; clicks: number }>;
  osData: Array<{ os: string; clicks: number }>;
  botHumanData: Array<{ name: string; value: number; color: string }> | null;
  hourlyActivityData: Array<{ hour: string; clicks: number }> | null;
  referrerData: Array<ReferrerData>;
  variantData?: Array<{
    variant_id: string;
    clicks: number;
    percentage: string | number;
  }>;
  variantMap?: VariantLabels;
  isLoading: boolean;
  /** "error" and "plan-required" replace the charts, so failures never read as zero clicks. */
  status?: LinkAnalyticsStatus;
  onRetry?: () => void;
  onShowAvailableRange?: () => void;
}) {
  if (status === "plan-required") {
    return (
      <section
        data-analytics-section
        className="flex flex-col items-center px-6 py-12 text-center"
      >
        <div className="bg-muted mb-4 rounded-lg p-3">
          <Lock className="text-muted-foreground size-5" aria-hidden />
        </div>
        <h3 className="text-foreground text-sm font-medium">
          Longer date ranges are part of Pro
        </h3>
        <p className="text-muted-foreground mt-2 max-w-md text-xs">
          Your plan includes the last 30 days of clicks.
        </p>
        {onShowAvailableRange && (
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            onClick={onShowAvailableRange}
          >
            Show last 30 days
          </Button>
        )}
      </section>
    );
  }

  if (status === "error") {
    return (
      <section
        data-analytics-section
        className="flex flex-col items-center px-6 py-12 text-center"
      >
        <EmptyStateImage
          alt=""
          className="mb-5 w-full max-w-[680px]"
          name="errorAnalytics"
        />
        <h3 className="text-foreground text-sm font-medium">
          Analytics could not load
        </h3>
        <p className="text-muted-foreground mt-2 max-w-md text-xs">
          Your link keeps working. Try again in a moment.
        </p>
        {onRetry && (
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
      </section>
    );
  }

  return (
    <section
      data-analytics-section
      className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0"
    >
      <ClicksTimelineChart data={clicksTimelineData} isLoading={isLoading} />
      {variantData && variantData.length > 0 && (
        <VariantPerformanceChart
          data={variantData}
          variantMap={variantMap}
          isLoading={isLoading}
        />
      )}
      <BrowserChart data={browserData} isLoading={isLoading} />
      <ReferrerChart data={referrerData} isLoading={isLoading} />
      <CountryChart data={countryData} isLoading={isLoading} />
      <DeviceOSChart
        deviceData={deviceData}
        osData={osData}
        isLoading={isLoading}
      />
      {botHumanData || isLoading ? (
        <BotTrafficChart data={botHumanData ?? []} isLoading={isLoading} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Traffic Analysis</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Human and bot counts are unavailable for this date range.
          </CardContent>
        </Card>
      )}
      {/* <LatencyChart data={latencyBuckets} isLoading={isLoading} /> */}
      {hourlyActivityData ? (
        <HourlyActivityChart data={hourlyActivityData} isLoading={isLoading} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Hourly Activity</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Hourly activity is unavailable for this date range. Daily totals are
            shown above.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

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
import { VariantPerformanceChart } from "@/components/charts/variant-performance-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  variantMap?: Record<string, string>;
  isLoading: boolean;
}) {
  return (
    <section data-analytics-section className="grid gap-6 lg:grid-cols-2">
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
          <CardHeader><CardTitle>Traffic Analysis</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Hourly Activity</CardTitle></CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Hourly activity is unavailable for this date range. Daily totals are shown above.
          </CardContent>
        </Card>
      )}
    </section>
  );
}

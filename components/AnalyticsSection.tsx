"use client";

import { ClicksTimelineChart } from "@/components/charts/clicks-timeline-chart";
import { BrowserChart } from "@/components/charts/browser-chart";
import { CountryChart } from "@/components/charts/country-chart";
import { DeviceOSChart } from "@/components/charts/device-os-chart";
import { BotTrafficChart } from "@/components/charts/bot-traffic-chart";
import {
  LatencyChart,
  type LatencyBucket,
} from "@/components/charts/latency-chart";
import { HourlyActivityChart } from "@/components/charts/hourly-activity-chart";

export function AnalyticsSection({
  clicksTimelineData,
  browserData,
  countryData,
  deviceData,
  osData,
  botHumanData,
  latencyBuckets,
  hourlyActivityData,
  isLoading,
}: {
  clicksTimelineData: Array<{ time: string; clicks: number }>;
  browserData: Array<{ month: string; clicks: number }>;
  countryData: Array<{ country: string; clicks: number }>;
  deviceData: Array<{ device: string; clicks: number }>;
  osData: Array<{ os: string; clicks: number }>;
  botHumanData: Array<{ name: string; value: number; color: string }>;
  latencyBuckets: Array<LatencyBucket>;
  hourlyActivityData: Array<{ hour: string; clicks: number }>;
  isLoading: boolean;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <ClicksTimelineChart data={clicksTimelineData} isLoading={isLoading} />
      <BrowserChart data={browserData} isLoading={isLoading} />
      <CountryChart data={countryData} isLoading={isLoading} />
      <DeviceOSChart
        deviceData={deviceData}
        osData={osData}
        isLoading={isLoading}
      />
      <BotTrafficChart data={botHumanData} isLoading={isLoading} />
      <LatencyChart data={latencyBuckets} isLoading={isLoading} />
      <HourlyActivityChart data={hourlyActivityData} isLoading={isLoading} />
    </section>
  );
}

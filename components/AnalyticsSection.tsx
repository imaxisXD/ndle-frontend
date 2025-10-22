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
}: {
  clicksTimelineData: Array<{ time: string; clicks: number }>;
  browserData: Array<{ month: string; clicks: number }>;
  countryData: Array<{ country: string; clicks: number }>;
  deviceData: Array<{ device: string; clicks: number }>;
  osData: Array<{ os: string; clicks: number }>;
  botHumanData: Array<{ name: string; value: number; color: string }>;
  latencyBuckets: Array<LatencyBucket>;
  hourlyActivityData: Array<{ hour: string; clicks: number }>;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <ClicksTimelineChart data={clicksTimelineData} />
      <BrowserChart data={browserData} />
      <CountryChart data={countryData} />
      <DeviceOSChart deviceData={deviceData} osData={osData} />
      <BotTrafficChart data={botHumanData} />
      <LatencyChart data={latencyBuckets} />
      <HourlyActivityChart data={hourlyActivityData} />
    </section>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitVerticalBarChart } from "@/components/charts/bklit-chart-kit";
import { Timer } from "iconoir-react";

export const description =
  "A bar chart showing latency performance distribution";

export type LatencyBucket = { range: string; count: number };

export function LatencyChart({
  data,
  isLoading,
}: {
  data?: Array<LatencyBucket>;
  isLoading?: boolean;
}) {
  const chartData = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Timer className="size-5" />
          Latency Performance
        </CardTitle>
        <CardDescription className="text-xs">
          Response time distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BklitVerticalBarChart
          data={chartData}
          emptyDescription="No latency samples available in this range."
          emptyTitle="No latency data"
          heightClassName="h-[250px]"
          isLoading={isLoading}
          labelKey="range"
          tooltipValueLabel="Requests"
          valueKey="count"
        />
      </CardContent>
    </Card>
  );
}

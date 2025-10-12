"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GraphUp as TrendingUpward } from "iconoir-react";

export const description = "A line chart showing clicks over time";

const chartData = [
  { time: "Oct 6", clicks: 2 },
  { time: "Oct 7", clicks: 8 },
  { time: "Oct 8", clicks: 13 },
];

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-1)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function ClicksTimelineChart() {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <TrendingUpward className="size-5" />
          Clicks Over Time
        </CardTitle>
        <CardDescription className="text-xs">
          Daily click activity trend
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              right: 20,
              left: 20,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient
                id="areaGradientTimeline"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="var(--color-blue-400)" />
                <stop offset="100%" stopColor="var(--color-blue-100)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
            />
            <YAxis
              dataKey="clicks"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="bg-white/90 backdrop-blur-lg"
                  indicator="dashed"
                  color="var(--color-blue-600)"
                />
              }
            />
            <Area
              dataKey="clicks"
              stroke="var(--color-blue-600)"
              strokeWidth={2}
              fill="url(#areaGradientTimeline)"
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

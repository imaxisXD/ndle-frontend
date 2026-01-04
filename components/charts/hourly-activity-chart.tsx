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
import { Clock } from "iconoir-react";
import { CircleGridLoaderIcon } from "@/components/icons";

export const description = "An area chart showing hourly click activity";

const defaultData = [
  { hour: "00:00", clicks: 0 },
  { hour: "04:00", clicks: 2 },
  { hour: "08:00", clicks: 0 },
  { hour: "11:00", clicks: 3 },
  { hour: "12:00", clicks: 3 },
  { hour: "16:00", clicks: 0 },
  { hour: "19:00", clicks: 1 },
  { hour: "20:00", clicks: 1 },
  { hour: "21:00", clicks: 4 },
  { hour: "22:00", clicks: 2 },
];

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-8)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function HourlyActivityChart({
  data,
  isLoading,
}: {
  data?: Array<{ hour: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const showEmptyState = !isLoading && Array.isArray(data) && data.length === 0;
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Clock className="size-5" />
          Hourly Activity
        </CardTitle>
        <CardDescription className="text-xs">
          Click activity throughout the day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
          isLoading={isLoading}
          showEmptyState={showEmptyState}
          loadingContent={
            <CircleGridLoaderIcon
              title="Loading analytics"
              className="text-primary"
            />
          }
          emptyStateContent={
            <div className="text-center">
              <p className="text-foreground font-medium">No analytics yet</p>
              <p className="text-muted-foreground mt-1 text-xs">
                This link hasn’t received any clicks in the selected range.
              </p>
            </div>
          }
        >
          <AreaChart
            data={data ?? defaultData}
            margin={{
              top: 20,
              right: 20,
              left: 20,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient
                id="areaGradientHourly"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#06b6d420" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
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
                  color="#0891b2"
                />
              }
            />
            <Area
              dataKey="clicks"
              stroke="#0891b2"
              strokeWidth={2}
              fill="url(#areaGradientHourly)"
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

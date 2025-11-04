"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

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
import { Timer } from "iconoir-react";
import { CircleGridLoaderIcon } from "@/components/icons";

export const description =
  "A bar chart showing latency performance distribution";

export type LatencyBucket = { range: string; count: number };

const chartConfig = {
  count: {
    label: "Requests",
    color: "var(--chart-6)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function LatencyChart({
  data,
  isLoading,
}: {
  data?: Array<LatencyBucket>;
  isLoading?: boolean;
}) {
  const showEmptyState =
    (!isLoading && Array.isArray(data) && data.length === 0) ||
    data == undefined;
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
          <BarChart
            accessibilityLayer
            data={data ?? []}
            margin={{
              top: 20,
              right: 20,
              left: 20,
              bottom: 20,
            }}
          >
            <defs>
              <linearGradient
                id="barGradientLatency"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="var(--color-teal-400)" />
                <stop offset="100%" stopColor="var(--color-teal-600)" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="range"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
            />
            <YAxis
              dataKey="count"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
            />
            {data && (
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="bg-white/90 backdrop-blur-lg"
                    indicator="dashed"
                    color="var(--color-teal-600)"
                    labelFormatter={(label, payload) => {
                      const point = payload?.[0]?.payload as
                        | { count?: number }
                        | undefined;
                      const total = data.reduce(
                        (sum, item) => sum + (item.count ?? 0),
                        0,
                      );
                      const percentage =
                        total > 0
                          ? (((point?.count ?? 0) / total) * 100).toFixed(1)
                          : "0.0";
                      return `${label} [${percentage}%]`;
                    }}
                  />
                }
              />
            )}
            <Bar
              dataKey="count"
              fill="url(#barGradientLatency)"
              radius={[4, 4, 0, 0]}
            >
              <LabelList
                dataKey="count"
                position="top"
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

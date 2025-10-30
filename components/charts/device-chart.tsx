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
import { AppleImac2021 as DeviceDesktop } from "iconoir-react";
import { CircleGridLoaderIcon } from "@/components/icons";

export const description = "A bar chart showing device type distribution";

const defaultData = [
  { device: "Desktop", clicks: 18 },
  { device: "Mobile", clicks: 5 },
];

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-4)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function DeviceChart({
  data,
  isLoading,
}: {
  data?: Array<{ device: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const showEmptyState =
    !isLoading && Array.isArray(data) && data.length === 0;
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <DeviceDesktop className="size-5" />
          Device Types
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution by device type
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] w-full"
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
            data={data ?? defaultData}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <defs>
              <linearGradient
                id="barGradientHorizontalDevice"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="var(--color-orange-300)" />
                <stop offset="100%" stopColor="var(--color-orange-500)" />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="device"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <XAxis dataKey="clicks" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="bg-white/90 backdrop-blur-lg"
                  indicator="dashed"
                  color="var(--color-orange-600)"
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as
                      | { device: string; clicks: number }
                      | undefined;
                    const dataset = data ?? defaultData;
                    const totalClicks = dataset.reduce(
                      (sum, item) => sum + item.clicks,
                      0,
                    );
                    const percentage =
                      row && totalClicks
                        ? ((row.clicks / totalClicks) * 100).toFixed(1)
                        : "0.0";

                    return `${label} [${percentage}%]`;
                  }}
                />
              }
            />
            <Bar
              dataKey="clicks"
              layout="vertical"
              fill="url(#barGradientHorizontalDevice)"
              radius={4}
              maxBarSize={20}
            >
              <LabelList
                dataKey="device"
                position="insideLeft"
                offset={8}
                className="fill-(--color-label)"
                fontSize={12}
              />
              <LabelList
                dataKey="clicks"
                position="right"
                offset={8}
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

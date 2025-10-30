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
import { Server } from "iconoir-react";
import { CircleGridLoaderIcon } from "@/components/icons";

export const description = "A bar chart showing datacenter performance";

const defaultData = [
  { datacenter: "BOM (Bombay)", clicks: 11 },
  { datacenter: "MRS (Marseille)", clicks: 12 },
];

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-9)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function DatacenterChart({
  data,
  isLoading,
}: {
  data?: Array<{ datacenter: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const showEmptyState =
    !isLoading && Array.isArray(data) && data.length === 0;
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Server className="size-5" />
          Datacenter Performance
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution by worker datacenter
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
                id="barGradientHorizontalDatacenter"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="datacenter"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.split(" ")[0]}
              hide
            />
            <XAxis dataKey="clicks" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="bg-white/90 backdrop-blur-lg"
                  indicator="dashed"
                  color="#d97706"
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as
                      | { datacenter: string; clicks: number }
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
              fill="url(#barGradientHorizontalDatacenter)"
              radius={4}
              maxBarSize={20}
            >
              <LabelList
                dataKey="datacenter"
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

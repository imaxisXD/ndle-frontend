"use client";

import React from "react";
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
import { CircleGridLoaderIcon } from "@/components/icons";
import { MouseLeftClickIcon } from "@phosphor-icons/react";

export const description = "A line chart showing clicks over time";

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--color-accent)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function ClicksTimelineChart({
  data,
  isLoading,
}: {
  data?: Array<{ time: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const gradientId = React.useId().replace(/:/g, "");
  const chartData = data;
  const showEmptyState = !isLoading && Array.isArray(data) && data.length === 0;

  return (
    <Card className="overflow-hidden lg:col-span-2">
      <CardHeader className="border-b py-5">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle className="flex items-center gap-2 font-medium">
              <MouseLeftClickIcon className="text-muted-foreground size-5" />
              Link Click Activity
            </CardTitle>
            <CardDescription className="pl-1 text-xs">
              Link click activity over time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[340px] w-full sm:h-[380px] md:h-[420px]"
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
                  id={`fillClicks-${gradientId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--color-clicks)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-clicks)"
                    stopOpacity={0.06}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const d = new Date(value);
                  if (Number.isNaN(d.getTime())) return String(value);
                  return d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                dataKey="clicks"
                domain={[0, "dataMax + 1"]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={36}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="rounded-sm bg-linear-to-br from-black/80 to-black text-white *:text-inherit **:text-inherit"
                    labelClassName="text-white font-medium"
                    labelFormatter={(value) => {
                      const d = new Date(String(value));
                      if (Number.isNaN(d.getTime())) return String(value);
                      return d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="clicks"
                type="monotone"
                fill={`url(#fillClicks-${gradientId})`}
                stroke="var(--color-clicks)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}

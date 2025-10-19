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
import { AppleImac2021 as Monitor } from "iconoir-react";

export const description = "A bar chart showing operating system distribution";

const defaultData = [{ os: "macOS", clicks: 23 }];

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-7)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function OperatingSystemChart({
  data,
}: {
  data?: Array<{ os: string; clicks: number }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Monitor className="size-5" />
          Operating Systems
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution by operating system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[200px] w-full"
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
                id="barGradientHorizontalOS"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="os"
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
                  color="#4f46e5"
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as
                      | { os: string; clicks: number }
                      | undefined;
                    const dataset = data ?? defaultData;
                    const totalClicks = dataset.reduce(
                      (sum: number, item: { os: string; clicks: number }) =>
                        sum + item.clicks,
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
              fill="url(#barGradientHorizontalOS)"
              radius={4}
              maxBarSize={20}
            >
              <LabelList
                dataKey="os"
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

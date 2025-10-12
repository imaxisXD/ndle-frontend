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

export const description = "A bar chart showing device type distribution";

const chartData = [
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

export function DeviceChart() {
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
        >
          <BarChart
            accessibilityLayer
            data={chartData}
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
                    const data = payload[0]?.payload;
                    const totalClicks = chartData.reduce(
                      (sum, item) => sum + item.clicks,
                      0,
                    );
                    const percentage = (
                      (data.clicks / totalClicks) *
                      100
                    ).toFixed(1);

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

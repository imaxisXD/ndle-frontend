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
import { Globe } from "iconoir-react";

export const description =
  "A bar chart showing country-wise click distribution";

const chartData = [
  { country: "United States", clicks: 1247 },
  { country: "United Kingdom", clicks: 892 },
  { country: "Canada", clicks: 634 },
  { country: "Germany", clicks: 521 },
  { country: "France", clicks: 456 },
  { country: "Australia", clicks: 389 },
  { country: "Japan", clicks: 312 },
  { country: "India", clicks: 298 },
  { country: "Brazil", clicks: 267 },
  { country: "Netherlands", clicks: 234 },
];

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-3)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function CountryChart() {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Globe className="size-5" />
          Geographic Distribution
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution by country
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
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
                id="barGradientHorizontalCountry"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="var(--color-emerald-300)" />
                <stop offset="100%" stopColor="var(--color-emerald-500)" />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="country"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 8)}
              hide
            />
            <XAxis dataKey="clicks" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="bg-white/90 backdrop-blur-lg"
                  indicator="dashed"
                  color="var(--color-emerald-600)"
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
              fill="url(#barGradientHorizontalCountry)"
              radius={4}
              maxBarSize={20}
            >
              <LabelList
                dataKey="country"
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

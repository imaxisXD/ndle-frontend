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
import { Link } from "iconoir-react";

export const description = "A bar chart showing link performance";

const chartData = [
  { link: "majorforksstrive", clicks: 9 },
  { link: "fancypansbrake", clicks: 6 },
  { link: "busyfactsdoubt", clicks: 8 },
];

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-5)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function LinkPerformanceChart() {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Link className="size-5" />
          Link Performance
        </CardTitle>
        <CardDescription className="text-xs">
          Top performing links by clicks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
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
                id="barGradientHorizontalLink"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor="var(--color-purple-300)" />
                <stop offset="100%" stopColor="var(--color-purple-500)" />
              </linearGradient>
            </defs>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="link"
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
                  color="var(--color-purple-600)"
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
              fill="url(#barGradientHorizontalLink)"
              radius={4}
              maxBarSize={20}
            >
              <LabelList
                dataKey="link"
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

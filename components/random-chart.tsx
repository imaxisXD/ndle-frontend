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
import { Internet } from "iconoir-react";

export const description = "A bar chart with a custom label";

const chartData = [
  { month: "Chrome", clicks: 186 },
  { month: "Firefox", clicks: 305 },
  { month: "Safari", clicks: 237 },
  { month: "Brave", clicks: 73 },
  { month: "Edge", clicks: 209 },
  { month: "Opera", clicks: 214 },
];

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-2)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function ChartBarLabelCustom() {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Internet className="size-5" />
          Browser Usage
        </CardTitle>
        <CardDescription>Browser usage by month</CardDescription>
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
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="month"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              hide
            />
            <XAxis dataKey="clicks" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  indicator="line"
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

                    return `${label} [${percentage} %]`;
                  }}
                />
              }
            />
            <Bar
              dataKey="clicks"
              layout="vertical"
              fill="var(--color-sky-500)"
              style={{ opacity: 0.5 }}
              radius={4}
              maxBarSize={20}
            >
              <LabelList
                dataKey="month"
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

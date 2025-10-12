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

export const description =
  "A bar chart showing latency performance distribution";

const chartData = [
  { range: "0-100ms", count: 8 },
  { range: "100-300ms", count: 7 },
  { range: "300-500ms", count: 5 },
  { range: "500ms+", count: 3 },
];

const chartConfig = {
  count: {
    label: "Requests",
    color: "var(--chart-6)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function LatencyChart() {
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
        >
          <BarChart
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
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="bg-white/90 backdrop-blur-lg"
                  indicator="dashed"
                  color="var(--color-teal-600)"
                  labelFormatter={(label, payload) => {
                    const data = payload[0]?.payload;
                    const total = chartData.reduce(
                      (sum, item) => sum + item.count,
                      0,
                    );
                    const percentage = ((data.count / total) * 100).toFixed(1);

                    return `${label} [${percentage}%]`;
                  }}
                />
              }
            />
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

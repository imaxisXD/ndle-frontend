"use client";

import { Cell, Pie, PieChart, Sector } from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

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
import { ShieldAlert } from "iconoir-react";

export const description =
  "A donut chart showing bot vs human traffic with active sector";

const chartData = [
  { name: "Human Traffic", value: 18, color: "var(--color-green-500)" },
  { name: "Bot Traffic", value: 5, color: "var(--color-red-500)" },
];

const chartConfig = {
  value: {
    label: "Traffic",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function BotTrafficChart() {
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <ShieldAlert className="size-5" />
          Traffic Analysis
        </CardTitle>
        <CardDescription className="text-xs">
          Human vs bot traffic distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
              activeIndex={0}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <Sector {...props} outerRadius={outerRadius + 10} />
              )}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="bg-white/90 backdrop-blur-lg"
                  indicator="dashed"
                  labelFormatter={(label, payload) => {
                    const data = payload[0]?.payload;
                    const total = chartData.reduce(
                      (sum, item) => sum + item.value,
                      0,
                    );
                    const percentage = ((data.value / total) * 100).toFixed(1);

                    return `${label} [${percentage}%]`;
                  }}
                />
              }
            />
          </PieChart>
        </ChartContainer>
        <div className="mt-4 flex justify-center gap-6">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

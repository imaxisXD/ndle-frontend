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
import { CircleGridLoaderIcon } from "@/components/icons";

export const description =
  "A donut chart showing bot vs human traffic with active sector";

const defaultData = [
  { name: "Human Traffic", value: 18, color: "var(--color-green-500)" },
  { name: "Bot Traffic", value: 5, color: "var(--color-red-500)" },
];

const chartConfig = {
  value: {
    label: "Traffic",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function BotTrafficChart({
  data,
  isLoading,
}: {
  data?: Array<{ name: string; value: number; color?: string }>;
  isLoading?: boolean;
}) {
  const showEmptyState =
    !isLoading && Array.isArray(data) && data.length === 0;
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
          <PieChart>
            <Pie
              data={data ?? defaultData}
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
              {(data ?? defaultData).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="bg-white/90 backdrop-blur-lg"
                  indicator="dashed"
                  labelFormatter={(label, payload) => {
                    const row = payload?.[0]?.payload as
                      | { name: string; value: number }
                      | undefined;
                    const dataset = data ?? defaultData;
                    const total = dataset.reduce(
                      (sum: number, item: { name: string; value: number }) =>
                        sum + item.value,
                      0,
                    );
                    const percentage =
                      row && total
                        ? ((row.value / total) * 100).toFixed(1)
                        : "0.0";

                    return `${label} [${percentage}%]`;
                  }}
                />
              }
            />
          </PieChart>
        </ChartContainer>
        <div className="mt-4 flex justify-center gap-6">
          {(data ?? defaultData).map((item) => (
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

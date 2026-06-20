"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitDonutChart } from "@/components/charts/bklit-chart-kit";
import { ShieldAlert } from "iconoir-react";

export const description =
  "A donut chart showing bot vs human traffic with active sector";

export function BotTrafficChart({
  data,
  isLoading,
}: {
  data?: Array<{ name: string; value: number; color?: string }>;
  isLoading?: boolean;
}) {
  const palette = ["var(--chart-line-primary)", "var(--chart-line-secondary)"];
  const chartData = (data ?? []).map((item, index) => ({
    label: item.name,
    value: item.value,
    color: item.color ?? palette[index % palette.length],
  }));

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
        <BklitDonutChart
          data={chartData}
          heightClassName="h-[250px]"
          isLoading={isLoading}
        />
        <div className="mt-4 flex justify-center gap-6">
          {chartData.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

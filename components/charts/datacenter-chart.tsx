"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import { Server } from "iconoir-react";

export const description = "A bar chart showing datacenter performance";

export function DatacenterChart({
  data,
  isLoading,
}: {
  data?: Array<{ datacenter: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const chartData = data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Server className="size-5" />
          Datacenter Performance
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution by worker datacenter
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BklitHorizontalBarChart
          data={chartData}
          heightClassName="h-[200px]"
          isLoading={isLoading}
          labelKey="datacenter"
          valueKey="clicks"
        />
      </CardContent>
    </Card>
  );
}

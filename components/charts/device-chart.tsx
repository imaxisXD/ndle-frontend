"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import { AppleImac2021 as DeviceDesktop } from "iconoir-react";

export const description = "A bar chart showing device type distribution";

export function DeviceChart({
  data,
  isLoading,
}: {
  data?: Array<{ device: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const chartData = data ?? [];
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
        <BklitHorizontalBarChart
          data={chartData}
          heightClassName="h-[200px]"
          isLoading={isLoading}
          labelKey="device"
          valueKey="clicks"
        />
      </CardContent>
    </Card>
  );
}

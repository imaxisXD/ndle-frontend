"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitVerticalBarChart } from "@/components/charts/bklit-chart-kit";
import { Clock } from "iconoir-react";

export const description = "An area chart showing hourly click activity";

export function HourlyActivityChart({
  data,
  isLoading,
}: {
  data?: Array<{ hour: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const chartData = data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Clock className="size-5" />
          Hourly Activity
        </CardTitle>
        <CardDescription className="text-xs">
          Click activity throughout the day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BklitVerticalBarChart
          data={chartData}
          emptyDescription="No hourly activity in this range."
          emptyTitle="No hourly activity"
          heightClassName="h-[250px]"
          isLoading={isLoading}
          labelKey="hour"
          valueKey="clicks"
        />
      </CardContent>
    </Card>
  );
}

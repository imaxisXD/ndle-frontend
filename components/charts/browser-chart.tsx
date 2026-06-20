"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import { Internet } from "iconoir-react";

export const description = "A bar chart with a custom label";

export function BrowserChart({
  data,
  isLoading,
}: {
  data?: Array<{ month: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const chartData = data ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Internet className="size-5" />
          Browser Usage
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution by browser
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BklitHorizontalBarChart
          data={chartData}
          heightClassName="h-[200px]"
          isLoading={isLoading}
          labelKey="month"
          valueKey="clicks"
        />
      </CardContent>
    </Card>
  );
}

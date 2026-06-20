"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import { Link } from "iconoir-react";

export const description = "A bar chart showing link performance";

export function LinkPerformanceChart({
  data,
  isLoading,
}: {
  data?: Array<{ link: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const chartData = data ?? [];
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
        <BklitHorizontalBarChart
          data={chartData}
          heightClassName="h-[250px]"
          isLoading={isLoading}
          labelFormatter={(value) => String(value ?? "").slice(0, 36)}
          labelKey="link"
          labelWidth={120}
          valueKey="clicks"
        />
      </CardContent>
    </Card>
  );
}

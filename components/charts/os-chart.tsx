"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import { AppleImac2021 as Monitor } from "iconoir-react";

export const description = "A bar chart showing operating system distribution";

export function OperatingSystemChart({
  data,
  isLoading,
}: {
  data?: Array<{ os: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const chartData = data ?? [];
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Monitor className="size-5" />
          Operating Systems
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution by operating system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BklitHorizontalBarChart
          data={chartData}
          heightClassName="h-[200px]"
          isLoading={isLoading}
          labelKey="os"
          valueKey="clicks"
        />
      </CardContent>
    </Card>
  );
}

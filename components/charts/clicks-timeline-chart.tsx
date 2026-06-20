"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitLineSeriesChart } from "@/components/charts/bklit-chart-kit";
import { MouseLeftClickIcon } from "@phosphor-icons/react";

export const description = "A line chart showing clicks over time";

export function ClicksTimelineChart({
  data,
  isLoading,
}: {
  data?: Array<{ time: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const chartData = data ?? [];

  return (
    <Card className="overflow-hidden lg:col-span-2">
      <CardHeader className="border-b py-5">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <CardTitle className="flex items-center gap-2 font-medium">
              <MouseLeftClickIcon className="text-muted-foreground size-5" />
              Link Click Activity
            </CardTitle>
            <CardDescription className="pl-1 text-xs">
              Link click activity over time
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <BklitLineSeriesChart
            data={chartData}
            dateKey="time"
            heightClassName="h-[340px] sm:h-[380px] md:h-[420px]"
            isLoading={isLoading}
            valueKey="clicks"
          />
        </div>
      </CardContent>
    </Card>
  );
}

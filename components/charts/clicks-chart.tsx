"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import { Calendar, RefreshDouble } from "iconoir-react";
import { cn, expandWeekday } from "@/lib/utils";

export function ClicksChart({
  data,
  isLoading,
  className,
}: {
  data?: Array<{ day: string; clicks: number }>;
  isLoading?: boolean;
  className?: string;
}) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item) => ({
      ...item,
      dayFull: expandWeekday(item.day),
    }));
  }, [data]);

  const averageClicks = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + d.clicks, 0);
    return Math.round(total / Math.max(chartData.length, 1));
  }, [chartData]);

  return (
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader>
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 font-medium">
              <Calendar className="size-5" />
              Weekly Click Count
              {isLoading && (
                <RefreshDouble className="text-muted-foreground h-3 w-3 animate-spin" />
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Click activity by day of week
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <BklitHorizontalBarChart
          barWidth={28}
          data={chartData}
          emptyDescription="No clicks recorded in this period."
          emptyTitle="No clicks recorded"
          heightClassName="h-[280px]"
          isLoading={isLoading}
          labelKey="dayFull"
          labelWidth={74}
          valueKey="clicks"
        />
      </CardContent>
      {!isLoading && chartData.length > 0 && (
        <CardFooter className="flex-col items-start gap-2 pt-4 text-sm">
          <div className="text-muted-foreground flex w-full items-center justify-between text-xs">
            <span>Average per day</span>
            <span className="text-foreground font-medium">
              [{averageClicks}]
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

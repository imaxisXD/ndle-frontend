"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { BklitLiveClickLineChart } from "@/components/charts/bklit-chart-kit";
import { cn } from "@/lib/utils";
import { format, parseISO, subMinutes } from "date-fns";

export interface LiveEventData {
  minute_ts: string;
  clicks: number;
}

export function LiveEventsChart({
  data,
  isLoading,
  className,
}: {
  data?: LiveEventData[];
  isLoading?: boolean;
  className?: string;
}) {
  // Fill in missing minutes with 0 clicks for a complete 60-minute timeline
  const chartData = useMemo(() => {
    if (!data) return [];

    const now = new Date();
    const minutes: Array<{ time: number; value: number }> = [];

    // Create map of existing data
    const dataMap = new Map<string, number>();
    data.forEach((d) => {
      // Normalize to minute precision
      const date = parseISO(d.minute_ts);
      const key = format(date, "HH:mm");
      dataMap.set(key, (dataMap.get(key) || 0) + d.clicks);
    });

    // Generate 60 minutes of data points
    for (let i = 59; i >= 0; i--) {
      const minuteTime = subMinutes(now, i);
      const key = format(minuteTime, "HH:mm");
      minutes.push({
        time: minuteTime.getTime() / 1000,
        value: dataMap.get(key) || 0,
      });
    }

    return minutes;
  }, [data]);

  const totalClicks = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.value, 0);
  }, [chartData]);
  const currentValue = chartData.at(-1)?.value ?? 0;

  return (
    <Card
      className={cn(
        "flex h-full flex-col border-zinc-200 bg-white text-zinc-900",
        className,
      )}
    >
      <CardHeader className="border-b border-zinc-200">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 font-medium text-zinc-900">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
              </span>
              Live Activity
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Clicks in the last 60 minutes
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="text-2xl font-semibold text-zinc-900 tabular-nums">
                {totalClicks}
              </div>
              <div className="text-xs text-zinc-400">total clicks</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grow p-4">
        <BklitLiveClickLineChart
          data={chartData}
          emptyDescription="No activity in the last hour."
          emptyTitle="No live activity"
          heightClassName="h-[120px]"
          isLoading={isLoading}
          value={currentValue}
          windowSeconds={3600}
        />
      </CardContent>
    </Card>
  );
}

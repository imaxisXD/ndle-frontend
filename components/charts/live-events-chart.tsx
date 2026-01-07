"use client";

import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format, parseISO, subMinutes } from "date-fns";

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

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
    const minutes: Array<{ time: string; clicks: number; label: string }> = [];

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
        time: key,
        clicks: dataMap.get(key) || 0,
        label: format(minuteTime, "h:mm a"),
      });
    }

    return minutes;
  }, [data]);

  const totalClicks = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.clicks, 0);
  }, [chartData]);

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
        {isLoading ? (
          <div className="flex h-[120px] items-center justify-center">
            <Skeleton className="h-full w-full rounded" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-muted-foreground flex h-[120px] items-center justify-center text-sm">
            No activity in the last hour.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[120px] w-full"
          >
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
            >
              <defs>
                <linearGradient id="liveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3"
                stroke="var(--border)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(value, index) => {
                  // Show fewer labels
                  if (index % 15 === 0) return value;
                  return "";
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                width={24}
                allowDecimals={false}
              />
              <ChartTooltip
                cursor={{ stroke: "#10b981", strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    className="rounded-sm bg-zinc-900 text-white"
                    labelClassName="text-white font-medium"
                    labelFormatter={(_, payload) => {
                      if (payload?.[0]?.payload?.label) {
                        return payload[0].payload.label;
                      }
                      return "";
                    }}
                    indicator="dot"
                    color="#10b981"
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#liveGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "#10b981" }}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

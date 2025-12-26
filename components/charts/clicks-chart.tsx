"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  LabelList,
  Cell,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/base-select";
import { RefreshDouble } from "iconoir-react";
import { cn, expandWeekday } from "@/lib/utils";
import { CursorClickIcon } from "@phosphor-icons/react/dist/ssr";

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--color-black)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

type TimeRange = "7d" | "30d" | "90d" | "1y";

export function ClicksChart({
  data,
  isLoading,
  timeRange,
  onTimeRangeChange,
  className,
}: {
  data?: Array<{ day: string; clicks: number }>;
  isLoading?: boolean;
  timeRange: TimeRange;
  onTimeRangeChange: (value: TimeRange) => void;
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

  const maxClicks = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    return Math.max(...chartData.map((d) => d.clicks));
  }, [chartData]);

  // Prepare data with background bar (always shows full width gray bar)
  const processedData = useMemo(() => {
    if (!chartData || chartData.length === 0) return [];
    const effectiveMax = maxClicks || 1;

    return chartData.map((item) => ({
      ...item,
      // Background shows the remaining portion (max - clicks)
      background: effectiveMax - item.clicks,
      // Actual clicks value
      clicks: item.clicks,
    }));
  }, [chartData, maxClicks]);

  // Domain max for proper scaling
  const domainMax = maxClicks || 1;

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
              <CursorClickIcon className="size-4.5" weight="duotone" />
              Weekly Click Count
              {isLoading && (
                <RefreshDouble className="h-3 w-3 animate-spin text-zinc-400" />
              )}
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Activity in selected range
            </CardDescription>
          </div>
          <Select
            value={timeRange}
            onValueChange={(value) => onTimeRangeChange(value as TimeRange)}
          >
            <SelectTrigger size="sm" className="rounded-sm bg-gray-50">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="grow p-6">
        {isLoading ? (
          <div className="flex h-[280px] flex-col justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-7 w-full rounded" />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            No clicks recorded in this period.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="[&_.recharts-cartesian-axis-tick_text]:fill-primary aspect-auto w-full"
            style={{ height: "280px" }}
          >
            <BarChart
              accessibilityLayer
              data={processedData}
              layout="vertical"
              margin={{
                right: 40,
                left: 8,
              }}
              barCategoryGap="20%"
              stackOffset="none"
            >
              <defs>
                <linearGradient
                  id="barGradientHorizontalClicks"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#ffcc00" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ffc700" stopOpacity={1} />
                </linearGradient>
              </defs>
              <YAxis
                dataKey="dayFull"
                type="category"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
                width={70}
                tick={{ fontSize: 12, fill: "#0a0a0a" }}
              />
              <XAxis type="number" hide domain={[0, domainMax]} />
              <CartesianGrid
                horizontal={false}
                strokeDasharray="5"
                stroke="var(--border)"
                strokeOpacity={1}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="rounded-sm bg-linear-to-br from-black/80 to-black text-white *:text-inherit **:text-inherit"
                    labelClassName="text-white font-medium"
                    indicator="dot"
                    hideIndicator={false}
                    formatter={(value, name) => {
                      if (name === "background") return null;
                      return (
                        <div className="flex items-center gap-2">
                          <span className="inline-block size-3 shrink-0 rounded-xs bg-amber-400" />
                          <span>Clicks</span>
                          <span className="ml-auto font-medium tabular-nums">
                            {value}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey="clicks"
                stackId="a"
                layout="vertical"
                radius={[4, 0, 0, 4]}
                barSize={28}
              >
                {processedData.map((entry, index) => (
                  <Cell
                    key={`clicks-${index}`}
                    fill={
                      entry.clicks === 0
                        ? "#e5e5e5"
                        : "url(#barGradientHorizontalClicks)"
                    }
                  />
                ))}
              </Bar>
              {/* Background bar (gray) - fills remaining space */}
              <Bar
                dataKey="background"
                stackId="a"
                layout="vertical"
                fill="var(--color-slate-200)"
                radius={[0, 4, 4, 0]}
                barSize={28}
                className="opacity-70 backdrop-blur-xl"
              >
                {/* Label showing click count on the right edge */}
                <LabelList
                  dataKey="clicks"
                  position="right"
                  offset={8}
                  className="fill-primary font-medium"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {!isLoading && chartData.length > 0 && (
        <CardFooter className="flex-col items-start gap-2 border-t border-zinc-200 pt-4 text-sm">
          <div className="flex w-full items-center justify-between text-xs text-zinc-500">
            <span>Average per day</span>
            <span className="font-medium text-zinc-900">[{averageClicks}]</span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

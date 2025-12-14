"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  LabelList,
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
import { Calendar, RefreshDouble } from "iconoir-react";
import { cn, expandWeekday } from "@/lib/utils";

// Custom label component to render day name inside the bar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DayLabel(props: any) {
  const { x = 0, y = 0, height = 0, value = "" } = props;

  return (
    <foreignObject
      x={Number(x) + 8}
      y={Number(y)}
      width={120}
      height={Number(height)}
    >
      <div className="flex h-full items-center">
        <span className="truncate text-xs font-medium text-black">
          {expandWeekday(String(value))}
        </span>
      </div>
    </foreignObject>
  );
}

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
    return data;
  }, [data]);

  const averageClicks = useMemo(() => {
    if (!chartData || chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + d.clicks, 0);
    return Math.round(total / Math.max(chartData.length, 1));
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
              <Calendar className="size-5" />
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
            <SelectTrigger
              size="sm"
              className="border-zinc-300 bg-zinc-100 text-zinc-900 shadow-sm"
            >
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
            className="aspect-auto w-full"
            style={{ height: "280px" }}
          >
            <BarChart
              accessibilityLayer
              data={chartData}
              layout="vertical"
              margin={{
                right: 48,
                left: 8,
              }}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient
                  id="barGradientHorizontalClicks"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#ffcc00ff" stopOpacity={1} />
                  <stop offset="100%" stopColor="#ffc700" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="day"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                hide
              />
              <XAxis
                dataKey="clicks"
                type="number"
                hide
                domain={[0, "dataMax"]}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="rounded-sm bg-linear-to-br from-black/80 to-black text-white *:text-inherit **:text-inherit"
                    labelClassName="text-white font-medium"
                    indicator="dot"
                    color="white"
                  />
                }
              />
              <Bar
                dataKey="clicks"
                layout="vertical"
                fill="url(#barGradientHorizontalClicks)"
                radius={4}
                barSize={28}
                minPointSize={160}
              >
                <LabelList
                  dataKey="day"
                  position="insideLeft"
                  content={DayLabel}
                />
                <LabelList
                  dataKey="clicks"
                  position="right"
                  offset={8}
                  className="fill-zinc-600"
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

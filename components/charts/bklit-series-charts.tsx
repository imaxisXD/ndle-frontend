"use client";

import type { CSSProperties } from "react";
import { curveMonotoneX } from "@visx/curve";
import { Background } from "@/components/charts/background";
import { Area } from "@/components/charts/area";
import { AreaChart } from "@/components/charts/area-chart";
import { Line } from "@/components/charts/line";
import { LineChart } from "@/components/charts/line-chart";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import {
  chartAccent,
  ChartStateFrame,
  formatChartNumber,
  getRecordValue,
  type ChartRecord,
} from "@/components/charts/bklit-shared";

export function BklitLineSeriesChart<T extends object>({
  data,
  dateKey,
  valueKey,
  heightClassName = "h-[250px]",
  color = chartAccent,
  valueLabel = "Clicks",
  valueFormatter = formatChartNumber,
  isLoading,
  emptyTitle,
  emptyDescription,
  numTicks = 5,
  allowDecimals = true,
  style,
}: {
  data: T[];
  dateKey: string;
  valueKey: string;
  heightClassName?: string;
  color?: string;
  valueLabel?: string;
  valueFormatter?: (value: unknown, item: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  numTicks?: number;
  /** Set false for counts so the value axis never shows 0.5. */
  allowDecimals?: boolean;
  style?: CSSProperties;
}) {
  return (
    <ChartStateFrame
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      heightClassName={heightClassName}
      isEmpty={data.length === 0}
      isLoading={isLoading}
      style={style}
    >
      <LineChart
        aspectRatio="auto"
        className="h-full w-full"
        data={data as ChartRecord[]}
        margin={{ top: 18, right: 40, bottom: 36, left: 18 }}
        xDataKey={dateKey}
      >
        <Background pattern="dots" opacity={0.85} />
        <Line
          // Monotone never overshoots its points, so zero days stay on the axis.
          curve={curveMonotoneX}
          dataKey={valueKey}
          // Keep the first and last days fully visible instead of fading them out.
          fadeEdges={false}
          dimOpacity={0.45}
          markers={{ inactiveBlur: 0, inactiveOpacity: 0.45 }}
          showMarkers={data.length <= 12}
          stroke={color}
        />
        <ChartTooltip
          indicatorColor={color}
          rows={(point) => [
            {
              color,
              label: valueLabel,
              value: valueFormatter(
                getRecordValue(point, valueKey),
                point as T,
              ),
            },
          ]}
        />
        <XAxis numTicks={numTicks} />
        <YAxis
          allowDecimals={allowDecimals}
          formatValue={(nextValue) => formatChartNumber(nextValue)}
          orientation="right"
        />
      </LineChart>
    </ChartStateFrame>
  );
}

export function BklitAreaSeriesChart<T extends object>({
  data,
  dateKey,
  valueKey,
  heightClassName = "h-[250px]",
  color = chartAccent,
  valueLabel = "Clicks",
  valueFormatter = formatChartNumber,
  isLoading,
  emptyTitle,
  emptyDescription,
  numTicks = 5,
  allowDecimals = true,
  style,
  gradient = true,
}: {
  data: T[];
  dateKey: string;
  valueKey: string;
  heightClassName?: string;
  color?: string;
  valueLabel?: string;
  valueFormatter?: (value: unknown, item: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  numTicks?: number;
  /** Set false for counts so the value axis never shows 0.5. */
  allowDecimals?: boolean;
  style?: CSSProperties;
  gradient?: boolean;
}) {
  return (
    <ChartStateFrame
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      heightClassName={heightClassName}
      isEmpty={data.length === 0}
      isLoading={isLoading}
      style={style}
    >
      <AreaChart
        aspectRatio="auto"
        className="h-full w-full"
        data={data as ChartRecord[]}
        margin={{ top: 18, right: 40, bottom: 36, left: 18 }}
        xDataKey={dateKey}
      >
        <Background pattern="dots" opacity={0.85} />
        <Area
          dataKey={valueKey}
          fill={color}
          fillOpacity={gradient ? 0.35 : 0.12}
          gradientToOpacity={gradient ? 0.04 : 0.12}
          showMarkers={data.length <= 12}
          stroke={color}
        />
        <ChartTooltip
          indicatorColor={color}
          rows={(point) => [
            {
              color,
              label: valueLabel,
              value: valueFormatter(
                getRecordValue(point, valueKey),
                point as T,
              ),
            },
          ]}
        />
        <XAxis numTicks={numTicks} />
        <YAxis
          allowDecimals={allowDecimals}
          formatValue={(nextValue) => formatChartNumber(nextValue)}
          orientation="right"
        />
      </AreaChart>
    </ChartStateFrame>
  );
}

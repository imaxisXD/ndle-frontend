"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";

import { CircleGridLoaderIcon } from "@/components/icons";
import { Area } from "@/components/charts/area";
import { AreaChart } from "@/components/charts/area-chart";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { Grid } from "@/components/charts/grid";
import { Line } from "@/components/charts/line";
import { LineChart } from "@/components/charts/line-chart";
import { LiveLine } from "@/components/charts/live-line";
import {
  LiveLineChart,
  type LiveLinePoint,
} from "@/components/charts/live-line-chart";
import { LiveXAxis } from "@/components/charts/live-x-axis";
import { LiveYAxis } from "@/components/charts/live-y-axis";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { TooltipContent } from "@/components/charts/tooltip/tooltip-content";
import { XAxis } from "@/components/charts/x-axis";
import { YAxis } from "@/components/charts/y-axis";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("en-US");

export const chartAccent = "var(--chart-line-primary)";
export const chartInk = "var(--chart-line-secondary)";
export const chartMuted = "var(--muted)";

type ChartRecord = Record<string, unknown>;

function getRecordValue(point: ChartRecord, key: string): unknown {
  return point[key];
}

export function formatChartNumber(value: unknown): string {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numberFormatter.format(numeric) : "0";
}

export function chartTotal<T extends object>(
  data: T[] | undefined,
  valueKey: string,
): number {
  return (data ?? []).reduce((sum, item) => {
    const value = getRecordValue(item as ChartRecord, valueKey);
    return sum + (typeof value === "number" ? value : Number(value ?? 0));
  }, 0);
}

function EmptyState({
  title = "No analytics yet",
  description = "This link hasn’t received any clicks in the selected range.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="text-center">
      <p className="text-foreground font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{description}</p>
    </div>
  );
}

function ChartStateFrame({
  isLoading,
  isEmpty,
  heightClassName,
  loadingTitle = "Loading analytics",
  emptyTitle,
  emptyDescription,
  style,
  children,
}: {
  isLoading?: boolean;
  isEmpty?: boolean;
  heightClassName: string;
  loadingTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative w-full", heightClassName)} style={style}>
      {isLoading ? (
        <div className="absolute inset-0 grid place-items-center">
          <CircleGridLoaderIcon title={loadingTitle} className="text-primary" />
        </div>
      ) : isEmpty ? (
        <div className="absolute inset-0 grid place-items-center">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ValueLabels<T extends object>({
  data,
  valueKey,
  valueFormatter = formatChartNumber,
  top = 18,
  bottom = 22,
}: {
  data: T[];
  valueKey: string;
  valueFormatter?: (value: unknown, item: T) => string;
  top?: number;
  bottom?: number;
}) {
  return (
    <div
      className="pointer-events-none absolute right-0 flex flex-col justify-around text-xs font-medium text-foreground tabular-nums"
      style={{ top, bottom }}
    >
      {data.map((item, index) => (
        <span key={`${index}-${String(getRecordValue(item as ChartRecord, valueKey))}`}>
          {valueFormatter(getRecordValue(item as ChartRecord, valueKey), item)}
        </span>
      ))}
    </div>
  );
}

export function BklitHorizontalBarChart<T extends object>({
  data,
  labelKey,
  valueKey = "clicks",
  heightClassName = "h-[200px]",
  color = chartAccent,
  labelFormatter = (value) => String(value ?? ""),
  valueFormatter = formatChartNumber,
  tooltipValueLabel = "Clicks",
  isLoading,
  emptyTitle,
  emptyDescription,
  loadingTitle,
  style,
  labelWidth = 96,
  barWidth = 18,
  showValueLabels = true,
}: {
  data: T[];
  labelKey: string;
  valueKey?: string;
  heightClassName?: string;
  color?: string;
  labelFormatter?: (value: unknown, item?: T) => string;
  valueFormatter?: (value: unknown, item: T) => string;
  tooltipValueLabel?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingTitle?: string;
  style?: CSSProperties;
  labelWidth?: number;
  barWidth?: number;
  showValueLabels?: boolean;
}) {
  const chartData = data as ChartRecord[];
  const total = useMemo(() => chartTotal(data, valueKey), [data, valueKey]);

  return (
    <ChartStateFrame
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      heightClassName={heightClassName}
      isEmpty={data.length === 0}
      isLoading={isLoading}
      loadingTitle={loadingTitle}
      style={style}
    >
      <BarChart
        aspectRatio="auto"
        barWidth={barWidth}
        className="h-full w-full"
        data={chartData}
        margin={{ top: 14, right: showValueLabels ? 40 : 12, bottom: 18, left: labelWidth }}
        orientation="horizontal"
        xDataKey={labelKey}
      >
        <Grid
          horizontal={false}
          stroke="var(--border)"
          strokeDasharray="5"
          vertical
        />
        <Bar dataKey={valueKey} fill={color} lineCap={4} stroke={color} />
        <BarYAxis />
        <ChartTooltip
          content={({ point }) => {
            const item = point as T;
            const value = getRecordValue(point, valueKey);
            const percentage =
              total > 0 ? ((Number(value ?? 0) / total) * 100).toFixed(1) : "0.0";

            return (
              <TooltipContent
                rows={[
                  {
                    color,
                    label: tooltipValueLabel,
                    value: valueFormatter(value, item),
                  },
                  {
                    color: "var(--chart-foreground-muted)",
                    label: "Share",
                    value: `${percentage}%`,
                  },
                ]}
                title={labelFormatter(getRecordValue(point, labelKey), item)}
              />
            );
          }}
          indicatorColor={color}
          showCrosshair={false}
          showDatePill={false}
        />
      </BarChart>
      {showValueLabels ? (
        <ValueLabels data={data} valueFormatter={valueFormatter} valueKey={valueKey} />
      ) : null}
    </ChartStateFrame>
  );
}

export function BklitVerticalBarChart<T extends object>({
  data,
  labelKey,
  valueKey,
  heightClassName = "h-[250px]",
  color = chartAccent,
  labelFormatter = (value) => String(value ?? ""),
  valueFormatter = formatChartNumber,
  tooltipValueLabel = "Clicks",
  isLoading,
  emptyTitle,
  emptyDescription,
  style,
}: {
  data: T[];
  labelKey: string;
  valueKey: string;
  heightClassName?: string;
  color?: string;
  labelFormatter?: (value: unknown, item?: T) => string;
  valueFormatter?: (value: unknown, item: T) => string;
  tooltipValueLabel?: string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  style?: CSSProperties;
}) {
  const chartData = data as ChartRecord[];
  const total = useMemo(() => chartTotal(data, valueKey), [data, valueKey]);

  return (
    <ChartStateFrame
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      heightClassName={heightClassName}
      isEmpty={data.length === 0}
      isLoading={isLoading}
      style={style}
    >
      <BarChart
        aspectRatio="auto"
        barGap={0.28}
        className="h-full w-full"
        data={chartData}
        margin={{ top: 18, right: 16, bottom: 36, left: 18 }}
        xDataKey={labelKey}
      >
        <Grid horizontal stroke="var(--border)" strokeDasharray="5" />
        <Bar dataKey={valueKey} fill={color} lineCap={4} stroke={color} />
        <BarXAxis maxLabels={8} />
        <ChartTooltip
          content={({ point }) => {
            const item = point as T;
            const value = getRecordValue(point, valueKey);
            const percentage =
              total > 0 ? ((Number(value ?? 0) / total) * 100).toFixed(1) : "0.0";

            return (
              <TooltipContent
                rows={[
                  {
                    color,
                    label: tooltipValueLabel,
                    value: valueFormatter(value, item),
                  },
                  {
                    color: "var(--chart-foreground-muted)",
                    label: "Share",
                    value: `${percentage}%`,
                  },
                ]}
                title={labelFormatter(getRecordValue(point, labelKey), item)}
              />
            );
          }}
          indicatorColor={color}
          showCrosshair={false}
        />
      </BarChart>
    </ChartStateFrame>
  );
}

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
        <Grid horizontal stroke="var(--border)" strokeDasharray="5" />
        <Line dataKey={valueKey} showMarkers={data.length <= 12} stroke={color} />
        <ChartTooltip
          indicatorColor={color}
          rows={(point) => [
            {
              color,
              label: valueLabel,
              value: valueFormatter(getRecordValue(point, valueKey), point as T),
            },
          ]}
        />
        <XAxis numTicks={numTicks} />
        <YAxis
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
        <Grid horizontal stroke="var(--border)" strokeDasharray="5" />
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
              value: valueFormatter(getRecordValue(point, valueKey), point as T),
            },
          ]}
        />
        <XAxis numTicks={numTicks} />
        <YAxis
          formatValue={(nextValue) => formatChartNumber(nextValue)}
          orientation="right"
        />
      </AreaChart>
    </ChartStateFrame>
  );
}

export function BklitLiveClickLineChart({
  data,
  value,
  heightClassName = "h-[120px]",
  color = chartAccent,
  windowSeconds = 3600,
  isLoading,
  emptyTitle,
  emptyDescription,
  style,
}: {
  data: LiveLinePoint[];
  value: number;
  heightClassName?: string;
  color?: string;
  windowSeconds?: number;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
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
      <LiveLineChart
        className="h-full w-full"
        data={data}
        margin={{ top: 8, right: 36, bottom: 30, left: 8 }}
        nowOffsetUnits={1}
        value={value}
        window={windowSeconds}
      >
        <Grid horizontal stroke="var(--border)" strokeDasharray="5" />
        <LiveLine dataKey="value" stroke={color} />
        <ChartTooltip
          content={({ point }) => (
            <TooltipContent
              rows={[
                {
                  color,
                  label: "Clicks",
                  value: formatChartNumber(point.value),
                },
              ]}
            />
          )}
          indicatorColor={color}
          showDatePill={false}
        />
        <LiveXAxis
          numTicks={4}
          formatTime={(time) =>
            new Date(time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })
          }
        />
        <LiveYAxis
          allowDecimals={false}
          formatValue={(nextValue) => formatChartNumber(nextValue)}
          position="right"
        />
      </LiveLineChart>
    </ChartStateFrame>
  );
}

export function BklitDonutChart({
  data,
  isLoading,
  heightClassName = "h-[250px]",
  emptyTitle,
  emptyDescription,
  style,
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  isLoading?: boolean;
  heightClassName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
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
      <div className="grid h-full place-items-center">
        <PieChart
          className="max-h-full max-w-full"
          cornerRadius={4}
          data={data}
          hoverOffset={8}
          innerRadius={64}
          padAngle={0.045}
          size={220}
        >
          {data.map((item, index) => (
            <PieSlice color={item.color} index={index} key={item.label} />
          ))}
          <PieCenter
            defaultLabel="Traffic"
            valueClassName="text-xl font-semibold tabular-nums"
            labelClassName="text-xs text-muted-foreground"
          />
        </PieChart>
      </div>
    </ChartStateFrame>
  );
}

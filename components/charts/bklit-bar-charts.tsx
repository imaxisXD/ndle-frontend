"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Background } from "@/components/charts/background";
import { Bar } from "@/components/charts/bar";
import { BarChart } from "@/components/charts/bar-chart";
import { BarChartLoading } from "@/components/charts/bar-chart-loading";
import { BarXAxis } from "@/components/charts/bar-x-axis";
import { BarYAxis } from "@/components/charts/bar-y-axis";
import { ChartTooltip } from "@/components/charts/tooltip/chart-tooltip";
import { TooltipContent } from "@/components/charts/tooltip/tooltip-content";
import { useChart } from "@/components/charts/chart-context";
import {
  chartAccent,
  ChartStateFrame,
  chartTotal,
  formatChartNumber,
  getRecordValue,
  type ChartRecord,
} from "@/components/charts/bklit-shared";

function ValueLabels<T extends object>({
  valueKey,
  valueFormatter = formatChartNumber,
}: {
  valueKey: string;
  valueFormatter?: (value: unknown, item: T) => string;
}) {
  const { margin, barScale, bandWidth, barXAccessor, data, containerRef } = useChart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const container = containerRef.current;

  if (!(mounted && container && barScale && bandWidth && barXAccessor)) {
    return null;
  }

  return createPortal(
    <div
      className="text-foreground pointer-events-none absolute top-0 right-0 bottom-0 text-xs font-medium tabular-nums"
      style={{ width: margin.right }}
    >
      {data.map((item, index) => {
        const label = barXAccessor(item);
        const rowOffset = Math.max(0, (barScale.bandwidth() - bandWidth) / 2);
        const y = (barScale(label) ?? 0) + rowOffset + margin.top;
        return (
          <div
            className="absolute right-0 flex items-center justify-end"
            key={`${index}-${label}-${String(getRecordValue(item, valueKey))}`}
            style={{ top: y, height: bandWidth, width: margin.right }}
          >
            {valueFormatter(getRecordValue(item, valueKey), item as T)}
          </div>
        );
      })}
    </div>,
    container,
  );
}

function estimateLabelWidth<T extends object>({
  data,
  labelKey,
  labelFormatter,
  maxWidth,
}: {
  data: T[];
  labelKey: string;
  labelFormatter: (value: unknown, item?: T) => string;
  maxWidth: number;
}) {
  if (data.length === 0) {
    return maxWidth;
  }

  const longestVisibleLength = data.reduce((longest, item) => {
    const label = labelFormatter(getRecordValue(item as ChartRecord, labelKey), item);
    // 16 characters fits names like "United Kingdom" or "Samsung Internet".
    return Math.max(longest, Math.min(label.length, 16));
  }, 0);

  return Math.max(48, Math.min(maxWidth, longestVisibleLength * 7 + 24));
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
  labelWidth = 136,
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
  const effectiveLabelWidth = useMemo(
    () =>
      estimateLabelWidth({
        data,
        labelKey,
        labelFormatter,
        maxWidth: labelWidth,
      }),
    [data, labelFormatter, labelKey, labelWidth],
  );
  const chartMargin = {
    top: 14,
    right: showValueLabels ? 40 : 12,
    bottom: 18,
    left: effectiveLabelWidth,
  };

  return (
    <ChartStateFrame
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      heightClassName={heightClassName}
      isEmpty={data.length === 0}
      isLoading={isLoading}
      loadingFallback={
        <BarChartLoading aspectRatio="auto" className="h-full w-full" margin={chartMargin} />
      }
      loadingTitle={loadingTitle}
      style={style}
    >
      <BarChart
        aspectRatio="auto"
        barWidth={barWidth}
        className="h-full w-full"
        data={chartData}
        margin={chartMargin}
        orientation="horizontal"
        xDataKey={labelKey}
      >
        <Background pattern="dots" opacity={0.85} />
        <Bar dataKey={valueKey} fill={color} lineCap={4} stroke={color} />
        <BarYAxis labelFormatter={(value, item) => labelFormatter(value, item as T)} />
        <ChartTooltip
          content={({ point }) => {
            const item = point as T;
            const value = getRecordValue(point, valueKey);
            const percentage = total > 0 ? ((Number(value ?? 0) / total) * 100).toFixed(1) : "0.0";

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
        {showValueLabels ? (
          <ValueLabels valueFormatter={valueFormatter} valueKey={valueKey} />
        ) : null}
      </BarChart>
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
  const chartMargin = { top: 18, right: 16, bottom: 36, left: 18 };

  return (
    <ChartStateFrame
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      heightClassName={heightClassName}
      isEmpty={data.length === 0}
      isLoading={isLoading}
      loadingFallback={
        <BarChartLoading aspectRatio="auto" className="h-full w-full" margin={chartMargin} />
      }
      style={style}
    >
      <BarChart
        aspectRatio="auto"
        barGap={0.28}
        className="h-full w-full"
        data={chartData}
        margin={chartMargin}
        xDataKey={labelKey}
      >
        <Background pattern="dots" opacity={0.85} />
        <Bar dataKey={valueKey} fill={color} lineCap={4} stroke={color} />
        <BarXAxis maxLabels={8} />
        <ChartTooltip
          content={({ point }) => {
            const item = point as T;
            const value = getRecordValue(point, valueKey);
            const percentage = total > 0 ? ((Number(value ?? 0) / total) * 100).toFixed(1) : "0.0";

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

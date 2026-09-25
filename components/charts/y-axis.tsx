"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useChartStable, useYScale } from "./chart-context";
import type { YAxisOrientation } from "./y-axis-scales";
import {
  integerTicks,
  resolveYAxisTickCount,
  Y_AXIS_DEFAULT_TICK_COUNT,
} from "./y-axis-ticks";

export interface YAxisProps {
  /** Scale group id (Recharts `yAxisId`). Default: `"left"`. */
  yAxisId?: string | number;
  /** Which side of the chart to render labels. Default: `"left"`. */
  orientation?: YAxisOrientation;
  /**
   * Approximate tick count hint for `scale.ticks()` (d3). Actual label count may differ.
   * Clamped to {@link Y_AXIS_MIN_TICK_COUNT}–{@link Y_AXIS_MAX_TICK_COUNT}. Default: 5.
   */
  numTicks?: number;
  /** Format large numbers (e.g. 1000 as "1k"). Default: true */
  formatLargeNumbers?: boolean;
  /** Custom formatter for tick labels (e.g. USD). Overrides formatLargeNumbers when set. */
  formatValue?: (value: number) => string;
  /** Allow fractional ticks such as 0.5. Set false for counts. Default: true */
  allowDecimals?: boolean;
}

function formatLabel(
  value: number,
  formatLargeNumbers: boolean,
  formatValue?: (value: number) => string
): string {
  if (formatValue) {
    return formatValue(value);
  }
  if (formatLargeNumbers && value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return String(value);
}

export function YAxis(props: YAxisProps) {
  const { containerRef } = useChartStable();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const container = containerRef.current;
  if (!(mounted && container)) {
    return null;
  }

  return <YAxisInner {...props} container={container} />;
}

const YAxisInner = memo(function YAxisInner({
  yAxisId,
  orientation = "left",
  numTicks = Y_AXIS_DEFAULT_TICK_COUNT,
  formatLargeNumbers = true,
  formatValue,
  allowDecimals = true,
  container,
}: YAxisProps & { container: HTMLDivElement }) {
  const { margin } = useChartStable();
  const yScale = useYScale(yAxisId);
  const isLeft = orientation === "left";

  const ticks = useMemo(() => {
    const niceTicks = yScale.ticks(resolveYAxisTickCount(numTicks));
    const tickValues = allowDecimals ? niceTicks : integerTicks(niceTicks);
    return tickValues.map((value) => ({
      value,
      y: (yScale(value) ?? 0) + margin.top,
      label: formatLabel(value, formatLargeNumbers, formatValue),
    }));
  }, [
    yScale,
    margin.top,
    numTicks,
    formatLargeNumbers,
    formatValue,
    allowDecimals,
  ]);

  return createPortal(
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute top-0 bottom-0"
        style={
          isLeft
            ? { left: 0, width: margin.left }
            : { right: 0, width: margin.right }
        }
      >
        {ticks.map((tick) => (
          <div
            className="absolute flex items-center"
            key={tick.value}
            style={{
              top: tick.y,
              transform: "translateY(-50%)",
              ...(isLeft
                ? { right: 0, justifyContent: "flex-end", paddingRight: 8 }
                : { left: 0, justifyContent: "flex-start", paddingLeft: 8 }),
            }}
          >
            <span className="text-chart-label text-xs">{tick.label}</span>
          </div>
        ))}
      </div>
    </div>,
    container
  );
});

YAxis.displayName = "YAxis";

export default YAxis;

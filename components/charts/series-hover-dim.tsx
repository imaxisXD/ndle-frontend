"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useChartHover } from "./chart-context";
import { useChartLegendHover } from "./chart-legend-hover";

interface SeriesHoverDimProps {
  /** Skip the dim entirely. */
  enabled?: boolean;
  /** Opacity to fade to while the chart is being hovered. */
  dimOpacity?: number;
  /** Tween duration in seconds. */
  durationSec?: number;
  /** Series index for multi-series legend hover dimming. */
  seriesIndex?: number;
  /**
   * Desaturate the series to gray while dimmed, so a highlight in the series
   * color stands out by hue instead of relying on opacity alone.
   */
  grayOnDim?: boolean;
  /** Stable chart visuals — area fill, stroke line, dashed tail, etc. */
  children: ReactNode;
}

// Both filters list the same functions so motion can interpolate between them.
const REST_FILTER = "grayscale(0) brightness(1)";
export const GRAY_DIM_FILTER = "grayscale(1) brightness(0.7)";

/**
 * Wraps stable series visuals with a hover-driven opacity animation.
 *
 * The wrapper subscribes to chart hover state internally so the parent (Area /
 * Line) can stay on the stable context slice. Children come in as a React prop:
 * because the parent is not re-rendering on hover, the children element
 * reference stays identical and React skips re-rendering them when this
 * wrapper re-renders. That keeps expensive subtrees (`SeriesDashTailOverlay`
 * and its `getPointAtLength` binary search) quiescent on cursor motion.
 */
export function SeriesHoverDim({
  enabled = true,
  dimOpacity = 0.5,
  durationSec = 0.4,
  seriesIndex,
  grayOnDim = false,
  children,
}: SeriesHoverDimProps) {
  const { tooltipData, selection } = useChartHover();
  const { hoveredIndex: legendHoveredIndex } = useChartLegendHover();
  const isChartHovering = tooltipData !== null || selection?.active === true;
  const isLegendDimmed =
    legendHoveredIndex !== null &&
    seriesIndex !== undefined &&
    legendHoveredIndex !== seriesIndex;
  const isDimmed = enabled && (isChartHovering || isLegendDimmed);
  const opacity = isDimmed ? dimOpacity : 1;
  const filter = grayOnDim && isDimmed ? GRAY_DIM_FILTER : REST_FILTER;
  return (
    <motion.g
      animate={grayOnDim ? { opacity, filter } : { opacity }}
      initial={grayOnDim ? { opacity: 1, filter: REST_FILTER } : { opacity: 1 }}
      transition={{ duration: durationSec, ease: "easeInOut" }}
    >
      {children}
    </motion.g>
  );
}

SeriesHoverDim.displayName = "SeriesHoverDim";

export default SeriesHoverDim;

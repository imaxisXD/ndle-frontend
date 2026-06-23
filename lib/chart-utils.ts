/**
 * Chart Utilities
 *
 * Functions for converting AI SDK tool outputs to json-render Spec format.
 */

import type { Spec } from "@json-render/react";

// Chart specification type (matches the Zod schema in the API route)
export interface ChartSpec {
  type:
    | "BarChart"
    | "LineChart"
    | "PieChart"
    | "AreaChart"
    | "MetricCard"
    | "ChartGrid";
  key: string;
  title: string;
  description?: string;
  query: string;
  xKey?: string;
  yKey?: string;
  nameKey?: string;
  valueKey?: string;
  orientation?: "horizontal" | "vertical";
  smooth?: boolean;
  showDots?: boolean;
  gradient?: boolean;
  donut?: boolean;
  showLabels?: boolean;
  format?: "number" | "percent" | "currency";
  prefix?: string;
  suffix?: string;
}

export interface DashboardSpec {
  charts: ChartSpec[];
  columns?: number;
}

/**
 * Convert a single chart specification to a Spec
 */
export function chartSpecToSpec(spec: ChartSpec): Spec {
  const elementKey = spec.key || `chart-${Date.now()}`;

  return {
    root: elementKey,
    elements: {
      [elementKey]: {
        type: spec.type,
        props: {
          title: spec.title,
          description: spec.description,
          query: spec.query,
          xKey: spec.xKey,
          yKey: spec.yKey,
          nameKey: spec.nameKey,
          valueKey: spec.valueKey,
          orientation: spec.orientation,
          smooth: spec.smooth,
          showDots: spec.showDots,
          gradient: spec.gradient,
          donut: spec.donut,
          showLabels: spec.showLabels,
          format: spec.format,
          prefix: spec.prefix,
          suffix: spec.suffix,
        },
        children: [],
      },
    },
  };
}

/**
 * Convert a dashboard specification (multiple charts) to a Spec
 */
export function dashboardSpecToSpec(spec: DashboardSpec): Spec {
  const gridKey = "chart-grid";
  const columns = spec.columns || 2;

  // Build elements map
  const elements: Spec["elements"] = {};

  // Add each chart as an element
  const childKeys: string[] = [];
  spec.charts.forEach((chart, index) => {
    const chartKey = chart.key || `chart-${index + 1}`;
    childKeys.push(chartKey);

    elements[chartKey] = {
      type: chart.type,
      props: {
        title: chart.title,
        description: chart.description,
        query: chart.query,
        xKey: chart.xKey,
        yKey: chart.yKey,
        nameKey: chart.nameKey,
        valueKey: chart.valueKey,
        orientation: chart.orientation,
        smooth: chart.smooth,
        showDots: chart.showDots,
        gradient: chart.gradient,
        donut: chart.donut,
        showLabels: chart.showLabels,
        format: chart.format,
        prefix: chart.prefix,
        suffix: chart.suffix,
      },
      children: [],
    };
  });

  // Add the grid container
  elements[gridKey] = {
    type: "ChartGrid",
    props: { columns },
    children: childKeys,
  };

  return {
    root: gridKey,
    elements,
  };
}

/**
 * Type guard to check if output is a single chart spec
 */
export function isChartSpec(output: unknown): output is ChartSpec {
  return (
    typeof output === "object" &&
    output !== null &&
    "type" in output &&
    "query" in output &&
    !("charts" in output)
  );
}

/**
 * Type guard to check if output is a dashboard spec
 */
export function isDashboardSpec(output: unknown): output is DashboardSpec {
  return (
    typeof output === "object" &&
    output !== null &&
    "charts" in output &&
    Array.isArray((output as DashboardSpec).charts)
  );
}

/**
 * Convert tool output to Spec, handling both single charts and dashboards
 */
export function toolOutputToSpec(output: unknown): Spec | null {
  if (isChartSpec(output)) {
    return chartSpecToSpec(output);
  }

  if (isDashboardSpec(output)) {
    return dashboardSpecToSpec(output);
  }

  console.warn("[chart-utils] Unknown tool output format:", output);
  return null;
}

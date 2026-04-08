/**
 * Chart Catalog for Agentic Chart Generation
 *
 * Uses JSON Render's createCatalog with Zod v4 schemas.
 * This catalog defines the guardrails for AI-generated charts.
 * The AI can ONLY generate JSON that matches these component schemas.
 */

import { createCatalog, generateCatalogPrompt } from "@json-render/core";
import { z } from "zod";

/**
 * Chart catalog defining all allowed chart components
 */
export const chartCatalog = createCatalog({
  name: "analytics-charts",
  components: {
    /**
     * Bar Chart - for comparing values across categories
     */
    BarChart: {
      props: z.object({
        title: z.string().describe("Chart title displayed at the top"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch data"),
        xKey: z.string().describe("Column name for X-axis (categories)"),
        yKey: z.string().describe("Column name for Y-axis (values)"),
        orientation: z
          .enum(["horizontal", "vertical"])
          .optional()
          .describe("Bar orientation, defaults to vertical"),
        color: z.string().optional().describe("Bar color (CSS color value)"),
      }),
      description:
        "Bar chart for comparing values across categories. Use for country clicks, device distribution, etc.",
    },

    /**
     * Line Chart - for time series and trends
     */
    LineChart: {
      props: z.object({
        title: z.string().describe("Chart title"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch data"),
        xKey: z.string().describe("Column name for X-axis (usually date/time)"),
        yKey: z.string().describe("Column name for Y-axis (values)"),
        smooth: z.boolean().optional().describe("Whether to use smooth curves"),
        showDots: z
          .boolean()
          .optional()
          .describe("Whether to show data points"),
      }),
      description:
        "Line chart for showing trends over time. Use for clicks over time, daily/weekly patterns.",
    },

    /**
     * Area Chart - filled line chart
     */
    AreaChart: {
      props: z.object({
        title: z.string().describe("Chart title"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch data"),
        xKey: z.string().describe("Column name for X-axis"),
        yKey: z.string().describe("Column name for Y-axis"),
        gradient: z
          .boolean()
          .optional()
          .describe("Whether to use gradient fill"),
      }),
      description:
        "Area chart with filled area under the line. Good for cumulative or volume data.",
    },

    /**
     * Pie Chart - for proportional data
     */
    PieChart: {
      props: z.object({
        title: z.string().describe("Chart title"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch data"),
        nameKey: z.string().describe("Column name for segment labels"),
        valueKey: z.string().describe("Column name for segment values"),
        showLabels: z
          .boolean()
          .optional()
          .describe("Whether to show percentage labels"),
        donut: z
          .boolean()
          .optional()
          .describe("Whether to render as donut chart"),
      }),
      description:
        "Pie/donut chart for showing proportions. Use for browser share, device breakdown, etc.",
    },

    ScatterChart: {
      props: z.object({
        title: z.string().describe("Chart title"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch data"),
        xKey: z.string().describe("X-axis column"),
        yKey: z.string().describe("Y-axis column"),
        zKey: z.string().optional().describe("Optional size column"),
        color: z.string().optional().describe("Point color"),
      }),
      description:
        "Scatter or bubble-style plot for correlations and distributions.",
    },

    RadarChart: {
      props: z.object({
        title: z.string().describe("Chart title"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch data"),
        categoryKey: z.string().describe("Category/dimension column"),
        valueKey: z.string().describe("Metric column"),
      }),
      description: "Radar/spider chart for comparing categories on one metric.",
    },

    RadialBarChart: {
      props: z.object({
        title: z.string().describe("Chart title"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch data"),
        nameKey: z.string().describe("Category label column"),
        valueKey: z.string().describe("Metric value column"),
      }),
      description: "Circular radial bar chart for ranked category comparisons.",
    },

    FunnelChart: {
      props: z.object({
        title: z.string().describe("Chart title"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch data"),
        nameKey: z.string().describe("Stage/category column"),
        valueKey: z.string().describe("Metric value column"),
      }),
      description:
        "Funnel chart for stage-wise dropoff and conversion-style analysis.",
    },

    DataTable: {
      props: z.object({
        title: z.string().optional().describe("Optional table title"),
        description: z.string().optional().describe("Optional subtitle"),
        query: z.string().describe("DuckDB SQL query to fetch tabular data"),
        columns: z.array(z.string()).optional().describe("Optional column order"),
        limit: z.number().min(1).max(200).optional().describe("Max rows to render"),
      }),
      description: "Tabular fallback for unsupported or highly detailed requests.",
    },

    FallbackCard: {
      props: z.object({
        title: z.string().optional().describe("Fallback card title"),
        description: z.string().optional().describe("Fallback description"),
        reason: z.string().optional().describe("Why a chart could not be produced"),
        suggestion: z.string().optional().describe("Suggested follow-up prompt"),
        examplePrompt: z.string().optional().describe("Concrete prompt example"),
      }),
      description:
        "Graceful non-chart fallback when no supported visualization matches.",
    },

    /**
     * Metric Card - single value display
     */
    MetricCard: {
      props: z.object({
        title: z.string().describe("Metric label"),
        query: z.string().describe("DuckDB SQL query returning a single value"),
        format: z
          .enum(["number", "percent", "currency"])
          .optional()
          .describe("How to format the value"),
        prefix: z.string().optional().describe("Text before the value"),
        suffix: z.string().optional().describe("Text after the value"),
      }),
      description:
        "Single metric display card. Use for totals, averages, or key numbers.",
    },

    /**
     * Container for multiple charts
     */
    ChartGrid: {
      props: z.object({
        columns: z
          .number()
          .min(1)
          .max(4)
          .optional()
          .describe("Number of columns in the grid, defaults to 2"),
      }),
      hasChildren: true,
      description: "Grid container to display multiple charts side by side.",
    },
  },

  actions: {
    /**
     * Refresh chart data
     */
    refresh: {
      description: "Refresh chart data",
    },

    /**
     * Export chart as image
     */
    export: {
      params: z.object({
        format: z.enum(["png", "svg"]).describe("Export format"),
      }),
      description: "Export chart as image",
    },
  },
});

/**
 * Generate the system prompt for AI from the catalog
 */
export function getChartSystemPrompt(tableSchema?: string): string {
  const basePrompt = generateCatalogPrompt(chartCatalog);

  const dataContext = tableSchema
    ? `

Available Data Schema:
${tableSchema}

The data is stored in parquet files and queried using DuckDB SQL.
When writing SQL queries, use standard SQL syntax compatible with DuckDB.
Common tables available:
- clicks: Contains click event data with columns like timestamp, country, device, browser, os, referer, slug, etc.

Example queries:
- Total clicks: SELECT COUNT(*) as total FROM clicks
- Clicks by country: SELECT country, COUNT(*) as clicks FROM clicks GROUP BY country ORDER BY clicks DESC LIMIT 10
- Clicks over time: SELECT DATE(timestamp) as date, COUNT(*) as clicks FROM clicks GROUP BY DATE(timestamp) ORDER BY date
`
    : "";

  const customInstructions = `

Additional instructions:
- Always include a descriptive title for each chart
- Write efficient SQL queries that return only necessary data
- Limit results to reasonable amounts (e.g., TOP 10) for readability
- Use appropriate chart types:
  - BarChart for comparing categories
  - LineChart for trends over time
  - PieChart for showing proportions (use sparingly, max 7-8 segments)
  - AreaChart for cumulative data
  - ScatterChart for correlation/distribution
  - RadarChart for category profile comparisons
  - RadialBarChart for circular category rankings
  - FunnelChart for stage/drop-off style data
  - MetricCard for single key values
  - DataTable when user asks for raw rows/details
- If a request cannot be represented as a supported chart, use FallbackCard
- If the user asks for multiple charts, wrap them in a ChartGrid
- Keep queries simple and performant
`;

  return basePrompt + dataContext + customInstructions;
}

/**
 * Type exports for use in components
 */
export type ChartCatalog = typeof chartCatalog;

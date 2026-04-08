/**
 * API Route: Chart Chat
 *
 * Streaming endpoint using AI SDK's tool calling pattern for structured chart generation.
 * Uses useChat on the client side for proper conversation history management.
 */

import {
  streamText,
  tool,
  convertToModelMessages,
  stepCountIs,
  type UIMessage,
} from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

export const runtime = "edge";
export const maxDuration = 30;

// Create OpenRouter client (OpenAI-compatible API)
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Chart type enum
const ChartTypeEnum = z.enum([
  "BarChart",
  "LineChart",
  "PieChart",
  "AreaChart",
  "MetricCard",
]);

// Chart specification schema
const ChartSpecSchema = z.object({
  type: ChartTypeEnum.describe("The type of chart to generate"),
  key: z.string().describe("Unique identifier for this chart"),
  title: z.string().describe("Chart title"),
  description: z.string().optional().describe("Chart description"),
  query: z
    .string()
    .describe(
      "DuckDB SQL query. Use {DATA} as table name. Always use COUNT(DISTINCT idempotency_key) instead of COUNT(*). Example: SELECT country, COUNT(DISTINCT idempotency_key) as clicks FROM {DATA} GROUP BY country",
    ),
  xKey: z
    .string()
    .optional()
    .describe("Column name for X-axis (for Bar, Line, Area charts)"),
  yKey: z
    .string()
    .optional()
    .describe("Column name for Y-axis (for Bar, Line, Area charts)"),
  nameKey: z.string().optional().describe("Column name for labels (PieChart)"),
  valueKey: z.string().optional().describe("Column name for values (PieChart)"),
  orientation: z
    .enum(["horizontal", "vertical"])
    .optional()
    .describe("Bar chart orientation"),
  smooth: z.boolean().optional().describe("Smooth lines (LineChart)"),
  showDots: z.boolean().optional().describe("Show data points (LineChart)"),
  gradient: z.boolean().optional().describe("Use gradient fill (AreaChart)"),
  donut: z.boolean().optional().describe("Use donut style (PieChart)"),
  showLabels: z.boolean().optional().describe("Show labels (PieChart)"),
  format: z
    .enum(["number", "percent", "currency"])
    .optional()
    .describe("Value format (MetricCard)"),
  prefix: z.string().optional().describe("Value prefix (MetricCard)"),
  suffix: z.string().optional().describe("Value suffix (MetricCard)"),
});

// Dashboard schema (multiple charts)
const DashboardSpecSchema = z.object({
  charts: z.array(ChartSpecSchema).describe("Array of charts to display"),
  columns: z
    .number()
    .min(1)
    .max(4)
    .default(2)
    .describe("Number of grid columns"),
});

const SYSTEM_PROMPT = `You are a data visualization assistant that helps users create charts from their analytics data.

AVAILABLE DATA COLUMNS:
- idempotency_key (VARCHAR) - unique event identifier (USE THIS FOR DEDUPLICATION)
- occurred_at (TIMESTAMP) - when the click happened
- country (VARCHAR) - country code (US, IN, GB, etc.)
- device (VARCHAR) - Desktop, Mobile, Tablet
- browser (VARCHAR) - Chrome, Safari, Firefox, etc.
- os (VARCHAR) - Windows, iOS, macOS, Android, Linux
- short_url (VARCHAR) - shortened URL path
- link_slug (VARCHAR) - link identifier
- referer (VARCHAR) - referring website URL
- utm_source, utm_medium, utm_campaign, utm_term, utm_content (VARCHAR) - UTM parameters
- is_bot (BOOLEAN) - whether click is from a bot

DUCKDB SQL RULES:
1. Use {DATA} as the table name - it will be replaced with actual data source
2. ALWAYS use COUNT(DISTINCT idempotency_key) instead of COUNT(*) to avoid duplicate events
3. Use CAST(occurred_at AS DATE) for date grouping
4. For time filters: WHERE occurred_at >= CAST(NOW() AS TIMESTAMP) - INTERVAL '7 days'

When the user asks for a visualization:
1. Understand what data they want to see
2. Use the generateChart tool for single charts
3. Use the generateDashboard tool for multiple charts
4. Write efficient SQL queries
5. Choose appropriate chart types based on the data

Be conversational and helpful. Explain what you're creating before generating the chart.`;

export async function POST(req: Request) {
  console.log("[chart-chat] ======== NEW REQUEST ========");

  try {
    const { messages }: { messages: UIMessage[] } = await req.json();
    console.log("[chart-chat] Messages count:", messages?.length);

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("[chart-chat] Starting streamText with tools...");

    const result = streamText({
      model: openrouter("anthropic/claude-3.5-sonnet"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(3), // Allow up to 3 steps for complex requests
      tools: {
        generateChart: tool({
          description:
            "Generate a single chart visualization. Use this for simple requests asking for one chart.",
          inputSchema: ChartSpecSchema,
          execute: async (params) => {
            console.log("[chart-chat] generateChart called with:", params);
            return params;
          },
        }),
        generateDashboard: tool({
          description:
            "Generate a dashboard with multiple charts. Use this when the user wants to see multiple visualizations or a comprehensive overview.",
          inputSchema: DashboardSpecSchema,
          execute: async (params) => {
            console.log("[chart-chat] generateDashboard called with:", params);
            return params;
          },
        }),
      },
    });

    console.log("[chart-chat] Returning UI message stream response");
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[chart-chat] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

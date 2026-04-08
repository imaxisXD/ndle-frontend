/**
 * API Route: Generate Chart
 *
 * Streaming endpoint that uses the AI SDK to generate JSONl patches for json-render.
 */

import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "edge";

// Create OpenRouter client (OpenAI-compatible API)
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SYSTEM_PROMPT = `You are a UI generator that outputs JSONL (JSON Lines) patches for a component renderer.

AVAILABLE COMPONENTS:
- BarChart (props: title, description, query, xKey, yKey, orientation, color)
- LineChart (props: title, description, query, xKey, yKey, smooth, showDots)
- AreaChart (props: title, description, query, xKey, yKey, gradient)
- PieChart (props: title, description, query, nameKey, valueKey, showLabels, donut)
- ScatterChart (props: title, description, query, xKey, yKey, zKey, color)
- RadarChart (props: title, description, query, categoryKey, valueKey)
- RadialBarChart (props: title, description, query, nameKey, valueKey)
- FunnelChart (props: title, description, query, nameKey, valueKey)
- MetricCard (props: title, format, prefix, suffix, query)
- DataTable (props: title, description, query, columns, limit)
- FallbackCard (props: title, description, reason, suggestion, examplePrompt)
- ChartGrid (props: columns, hasChildren: true)

OUTPUT FORMAT:
You MUST output valid JSONL where each line is a complete JSON object.
NO markdown, NO code blocks, ONLY raw JSONL lines.

=== SINGLE CHART (preferred for simple requests) ===
{"op":"add","path":"/elements/chart-1","value":{"key":"chart-1","type":"LineChart","props":{"title":"Clicks Over Time","query":"SELECT CAST(occurred_at AS DATE) as date, COUNT(DISTINCT idempotency_key) as clicks FROM {DATA} GROUP BY CAST(occurred_at AS DATE) ORDER BY date","xKey":"date","yKey":"clicks"}}}
{"op":"set","path":"/root","value":"chart-1"}

=== MULTIPLE CHARTS ===
{"op":"add","path":"/elements/chart-1","value":{"key":"chart-1","type":"BarChart","props":{"title":"By Country","query":"SELECT country, COUNT(DISTINCT idempotency_key) as clicks FROM {DATA} GROUP BY country ORDER BY clicks DESC LIMIT 10","xKey":"country","yKey":"clicks"}}}
{"op":"add","path":"/elements/chart-2","value":{"key":"chart-2","type":"LineChart","props":{"title":"Over Time","query":"SELECT CAST(occurred_at AS DATE) as date, COUNT(DISTINCT idempotency_key) as clicks FROM {DATA} GROUP BY CAST(occurred_at AS DATE) ORDER BY date","xKey":"date","yKey":"clicks"}}}
{"op":"add","path":"/elements/main","value":{"key":"main","type":"ChartGrid","props":{"columns":2},"children":["chart-1","chart-2"]}}
{"op":"set","path":"/root","value":"main"}

=== FALLBACK WHEN CHART TYPE IS UNSUPPORTED OR TOO AMBIGUOUS ===
{"op":"add","path":"/elements/fallback-1","value":{"key":"fallback-1","type":"FallbackCard","props":{"title":"Requested chart type not supported","description":"Showing closest available options","reason":"Heatmap/Sankey/Gantt are not available in this renderer.","suggestion":"Show top countries by clicks as a bar chart","examplePrompt":"Show top countries by clicks as a bar chart"}}}
{"op":"set","path":"/root","value":"fallback-1"}

CHART TYPE MAPPING RULES:
- If user asks for bubble chart -> use ScatterChart with zKey.
- If user asks for spider chart -> use RadarChart.
- If user asks for donut chart -> use PieChart with donut=true.
- If user asks for histogram -> use BarChart over binned values.
- If user asks for unsupported types (heatmap/sankey/treemap/gantt/candlestick), use DataTable or FallbackCard.

CRITICAL RULES:
1. Use {DATA} as the table name in SQL. It will be replaced with actual data source.
2. ALWAYS use COUNT(DISTINCT idempotency_key) instead of COUNT(*) to avoid duplicate events.
3. For single visual requests, set the visual directly as root (no ChartGrid wrapper).
4. For multiple visuals, add all child elements first, then add ChartGrid with children array.
5. The children array must list exact child keys.
6. Always set /root as the LAST operation.
7. DO NOT add time filters unless the user explicitly asks for a time range.
8. For top links use link_slug. For full URLs use short_url.
9. When the request is very detailed/raw data oriented, prefer DataTable.
10. If no safe visualization can be produced, use FallbackCard instead of invalid components.
11. For DataTable, columns must be an array of plain column-name strings only.

Available columns: idempotency_key (VARCHAR - unique event ID), occurred_at (TIMESTAMP), country, device, browser, os, short_url, link_slug, referer, utm_source, utm_medium, utm_campaign (VARCHAR), is_bot (BOOLEAN)

DUCKDB DATE RULES (only when time filter is requested):
- Use CAST(occurred_at AS DATE) for date grouping
- For time filters: WHERE occurred_at >= CAST(NOW() AS TIMESTAMP) - INTERVAL '7 days'
- Only add time filters when user explicitly asks for them.
`;

export async function POST(req: Request) {
  console.log("[generate-chart] ======== NEW REQUEST ========");
  console.log("[generate-chart] Request method:", req.method);
  console.log(
    "[generate-chart] Content-Type:",
    req.headers.get("Content-Type"),
  );

  try {
    // Clone request to read body for logging (since body can only be read once)
    const rawBody = await req.text();
    console.log("[generate-chart] Raw request body:", rawBody);

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error("[generate-chart] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("[generate-chart] Parsed body:", parsedBody);
    console.log("[generate-chart] Body keys:", Object.keys(parsedBody));

    // useUIStream sends { prompt: string } in the request body
    const { prompt } = parsedBody;

    console.log("[generate-chart] Extracted prompt:", prompt);
    console.log("[generate-chart] Prompt type:", typeof prompt);

    if (!prompt || typeof prompt !== "string") {
      console.error("[generate-chart] Invalid prompt - returning 400");
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const fullPrompt = `Generate UI for: ${prompt}`;
    console.log("[generate-chart] Full prompt to AI:", fullPrompt);
    console.log(
      "[generate-chart] System prompt length:",
      SYSTEM_PROMPT.length,
      "chars",
    );

    // Stream textual JSONL patches
    console.log("[generate-chart] Creating streamText with model...");
    const result = streamText({
      model: openrouter("minimax/minimax-m2.1"),
      system: SYSTEM_PROMPT,
      prompt: fullPrompt,
    });

    console.log("[generate-chart] streamText result created:", typeof result);
    console.log(
      "[generate-chart] Result has toTextStreamResponse:",
      typeof result.toTextStreamResponse === "function",
    );

    const response = result.toTextStreamResponse();
    console.log("[generate-chart] Response created, returning stream response");
    console.log(
      "[generate-chart] Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    return response;
  } catch (error) {
    console.error("[generate-chart] ======== ERROR ========");
    console.error("[generate-chart] Error type:", error?.constructor?.name);
    console.error("[generate-chart] Error message:", error);
    console.error("[generate-chart] Error stack:", (error as Error)?.stack);
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

"use client";

/**
 * Agentic Chart Chat Component
 *
 * Chat interface for natural language chart generation with conversation history.
 * Uses json-render's useUIStream for streaming and maintains chat history in local state.
 * Light theme only, following json-render's dashboard example pattern.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  PaperPlaneTilt,
  Sparkle as SparkleIcon,
  ChartBar as ChartBarIcon,
  ArrowsOut as ArrowsOutIcon,
  ArrowsIn as ArrowsInIcon,
  Trash as TrashIcon,
  User,
  Robot,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useDuckDB } from "@/hooks/use-duckdb";
import { getTableSchema } from "@/hooks/use-chart-query";
import { ChartQueryProvider } from "@/hooks/chart-query-context";
import type { ColdFile } from "@/types/analytics-v2";
import { useUIStream, Renderer, JSONUIProvider } from "@json-render/react";
import type { UITree } from "@json-render/core";
import { chartRegistry } from "./chart-registry";

// Chat message type
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tree?: UITree | null;
  timestamp: Date;
}

interface AgenticChartChatProps {
  className?: string;
}

export function AgenticChartChat({ className }: AgenticChartChatProps) {
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [tableSchema, setTableSchema] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chartColdFiles, setChartColdFiles] = useState<ColdFile[]>([]);
  const [chartHotFile, setChartHotFile] = useState<ColdFile | null>(null);
  const [isDataSourceLoading, setIsDataSourceLoading] = useState(true);
  const [dataSourceError, setDataSourceError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { db } = useDuckDB();
  const isDataReady = !isDataSourceLoading && !dataSourceError;

  // Fetch table schema when DB is ready
  useEffect(() => {
    if (db) {
      getTableSchema(db).then(setTableSchema);
    }
  }, [db]);

  // Fetch a full-range data source for Ask AI charts (independent from dashboard filters/range)
  const loadChartDataSource = useCallback(async () => {
    setIsDataSourceLoading(true);
    setDataSourceError(null);
    try {
      const end = new Date().toISOString().slice(0, 10);
      const params = new URLSearchParams({
        start: "2020-01-01",
        end,
      });
      const response = await fetch(`/api/analytics/v2?${params.toString()}`);
      if (!response.ok) {
        throw new Error(
          `Failed to load chart data source: ${response.status} ${response.statusText}`,
        );
      }
      const payload = (await response.json()) as {
        cold?: ColdFile[];
        hot?: ColdFile | null;
      };
      setChartColdFiles(payload.cold || []);
      setChartHotFile(payload.hot || null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load chart data";
      setDataSourceError(message);
      setChartColdFiles([]);
      setChartHotFile(null);
    } finally {
      setIsDataSourceLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChartDataSource();
  }, [loadChartDataSource]);

  // Use json-render hook for streaming UI (same as their example)
  const { tree, isStreaming, error, send, clear } = useUIStream({
    api: "/api/generate-chart",
    onComplete: (completedTree) => {
      // When streaming completes, save the tree to the last assistant message
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === "assistant") {
          lastMsg.tree = completedTree;
        }
        return updated;
      });
    },
    onError: (err) => {
      console.error("[AgenticChart] Error:", err);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, tree]);

  // Handle submit
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isStreaming || !isDataReady) return;

      const userMessage = input.trim();
      setInput("");

      // Add user message to history
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: new Date(),
      };

      // Add placeholder assistant message
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
        tree: null,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      // Include table schema as context
      const promptContext: string[] = [];
      if (tableSchema) {
        promptContext.push(`[Table Schema: ${tableSchema}]`);
      }

      const fullPrompt =
        promptContext.length > 0
          ? `${userMessage}\n\n${promptContext.join("\n")}`
          : userMessage;

      // Send to API
      await send(fullPrompt);
    },
    [input, isStreaming, isDataReady, send, tableSchema],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  const handleClearChat = useCallback(() => {
    setMessages([]);
    clear();
  }, [clear]);

  // Example prompts
  const examplePrompts = [
    "Show total clicks by country as a bar chart",
    "Create a line chart of clicks over the last 7 days",
    "Display top 5 referrers as a pie chart",
    "Show me a metric card with total clicks",
  ];

  const hasMessages = messages.length > 0;

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden border border-zinc-200 bg-white shadow-lg transition-all duration-300",
        isExpanded ? "fixed inset-4 z-50" : "min-h-[500px]",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-200 bg-zinc-50 py-3">
        <div className="flex items-center gap-2">
          <SparkleIcon className="h-5 w-5 text-amber-500" weight="duotone" />
          <CardTitle className="text-base font-semibold text-zinc-900">
            Ask AI to Create Charts
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {hasMessages && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-red-500"
              onClick={handleClearChat}
              title="Clear chat"
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ArrowsInIcon className="h-4 w-4" />
            ) : (
              <ArrowsOutIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden bg-white p-4">
        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 space-y-4 overflow-y-auto"
        >
          {!hasMessages && !isStreaming ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <ChartBarIcon
                className="h-12 w-12 text-zinc-300"
                weight="duotone"
              />
              <div>
                <p className="text-sm font-medium text-zinc-700">
                  Describe the chart you want to create
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  I&apos;ll generate it from your analytics data
                </p>
                {isDataSourceLoading && (
                  <p className="mt-2 text-xs text-amber-600">
                    Preparing chart data source...
                  </p>
                )}
                {dataSourceError && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-red-600">{dataSourceError}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void loadChartDataSource()}
                      className="h-7 text-xs"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {examplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-100"
                    onClick={() => setInput(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Render chat history */}
              {messages.map((message, index) => (
                <div key={message.id} className="space-y-3">
                  {/* User message */}
                  {message.role === "user" && (
                    <div className="flex gap-3 rounded-lg bg-zinc-100 p-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                        <User className="h-4 w-4" weight="bold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-xs font-medium text-zinc-500">
                          You
                        </p>
                        <p className="text-sm whitespace-pre-wrap text-zinc-900">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Assistant message with chart */}
                  {message.role === "assistant" && (
                    <div className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600">
                        <Robot className="h-4 w-4" weight="bold" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-2 text-xs font-medium text-zinc-500">
                          AI Assistant
                        </p>

                        {/* Show loading for the last assistant message while streaming */}
                        {index === messages.length - 1 && isStreaming ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-1">
                              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
                            </div>
                            {/* Show streaming tree */}
                            {tree &&
                              Object.keys(tree.elements || {}).length > 0 && (
                                <ChartQueryProvider
                                  coldFiles={chartColdFiles}
                                  hotFile={chartHotFile}
                                >
                                  <JSONUIProvider registry={chartRegistry}>
                                    <Renderer
                                      tree={tree}
                                      registry={chartRegistry}
                                      loading={true}
                                    />
                                  </JSONUIProvider>
                                </ChartQueryProvider>
                              )}
                          </div>
                        ) : message.tree &&
                          Object.keys(message.tree.elements || {}).length >
                            0 ? (
                          <ChartQueryProvider
                            coldFiles={chartColdFiles}
                            hotFile={chartHotFile}
                          >
                            <JSONUIProvider registry={chartRegistry}>
                              <Renderer
                                tree={message.tree}
                                registry={chartRegistry}
                                loading={false}
                              />
                            </JSONUIProvider>
                          </ChartQueryProvider>
                        ) : (
                          <p className="text-sm text-zinc-500 italic">
                            Generating chart...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Error display */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  Error: {error.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the chart you want..."
            className="min-h-[44px] flex-1 resize-none border-zinc-200 bg-white"
            rows={1}
            disabled={isStreaming || !isDataReady}
          />
          <Button
            type="submit"
            size="icon"
            className="h-11 w-11 shrink-0 bg-zinc-900 text-white hover:bg-zinc-800"
            disabled={isStreaming || !input.trim() || !isDataReady}
          >
            <PaperPlaneTilt className="h-5 w-5" weight="fill" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

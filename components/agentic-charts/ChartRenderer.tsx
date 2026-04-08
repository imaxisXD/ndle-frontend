"use client";

/**
 * Chart Renderer Component
 *
 * Wrapper that takes an AI-generated JSON tree and renders charts.
 * Uses JSON Render's Renderer with custom data fetching via DuckDB.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Renderer,
  DataProvider,
  ActionProvider,
  type ComponentRegistry,
} from "@json-render/react";

interface ChartRendererProps {
  tree: unknown;
  registry: ComponentRegistry;
  execute: (query: string) => Promise<Array<Record<string, unknown>>>;
  onAction?: (actionName: string, params: Record<string, unknown>) => void;
}

/**
 * Chart data provider wrapper
 * Fetches data for charts based on their query props
 */
export function ChartRenderer({
  tree,
  registry,
  execute,
  onAction,
}: ChartRendererProps) {
  const [chartData, setChartData] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Extract all queries from the tree and fetch data
  useEffect(() => {
    if (!tree) {
      setIsLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const queries = extractQueries(tree);
        const data: Record<string, unknown> = {};

        for (const { key, query } of queries) {
          try {
            const result = await execute(query);
            data[key] = result;
          } catch (err) {
            console.error(`Query failed for ${key}:`, err);
            data[key] = [];
          }
        }

        setChartData(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [tree, execute]);

  // Handle actions
  const handleAction = useCallback(
    (actionName: string, params: Record<string, unknown> = {}) => {
      onAction?.(actionName, params);
    },
    [onAction],
  );

  // Create action handlers
  const actionHandlers = useMemo(
    () => ({
      refresh: async () => {
        // Trigger data refetch
        setChartData({});
      },
      export: async (params: { format?: string }) => {
        handleAction("export", params);
      },
    }),
    [handleAction],
  );

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-600">Error loading data</p>
        <p className="mt-1 text-xs text-red-500">{error.message}</p>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-center">
        <p className="text-sm text-zinc-500">No chart to display</p>
      </div>
    );
  }

  return (
    <DataProvider initialData={{ charts: chartData, isLoading }}>
      <ActionProvider handlers={actionHandlers}>
        <Renderer tree={tree as any} registry={registry} />
      </ActionProvider>
    </DataProvider>
  );
}

/**
 * Extract query information from the tree
 */
function extractQueries(
  tree: unknown,
  prefix = "chart",
): Array<{ key: string; query: string }> {
  const queries: Array<{ key: string; query: string }> = [];

  if (!tree || typeof tree !== "object") {
    return queries;
  }

  const traverse = (node: unknown, index: number): void => {
    if (!node || typeof node !== "object") return;

    const obj = node as Record<string, unknown>;

    // Check if this node has a query prop
    if (obj.props && typeof obj.props === "object") {
      const props = obj.props as Record<string, unknown>;
      if (typeof props.query === "string") {
        queries.push({
          key: `${prefix}-${index}`,
          query: props.query,
        });
      }
    }

    // Traverse children
    if (Array.isArray(obj.children)) {
      obj.children.forEach((child, i) => traverse(child, index * 100 + i));
    }
  };

  // Handle array of elements
  if (Array.isArray(tree)) {
    tree.forEach((item, i) => traverse(item, i));
  } else {
    traverse(tree, 0);
  }

  return queries;
}

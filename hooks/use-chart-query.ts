/**
 * Hook for executing DuckDB queries from AI-generated charts
 *
 * Takes a SQL query string from the AI with {DATA} placeholder,
 * registers parquet files, and executes against them.
 */

import { useState, useCallback, useRef } from "react";
import { useDuckDB } from "./use-duckdb";
import { useAuth } from "@clerk/nextjs";
import type { ColdFile } from "@/types/analytics-v2";

interface UseChartQueryResult {
  data: Array<Record<string, unknown>> | null;
  isLoading: boolean;
  error: Error | null;
  execute: (query: string) => Promise<Array<Record<string, unknown>>>;
  setFiles: (files: ColdFile[]) => void;
}

const FILE_PROXY_WORKER_URL =
  process.env.NEXT_PUBLIC_FILE_PROXY_URL ||
  "https://proxy-file-worker.sunny735084.workers.dev";

// Cache for registered files
const registeredFiles = new Map<string, string>();

function getStableFileName(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `chart_${Math.abs(hash).toString(36)}.parquet`;
}

/**
 * Hook to execute SQL queries against DuckDB WASM with parquet files
 */
export function useChartQuery(): UseChartQueryResult {
  const { db, loading: dbLoading, error: dbError } = useDuckDB();
  const { getToken } = useAuth();
  const [data, setData] = useState<Array<Record<string, unknown>> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(dbError);
  const coldFilesRef = useRef<ColdFile[]>([]);

  const setFiles = useCallback((files: ColdFile[]) => {
    coldFilesRef.current = files;
  }, []);

  const execute = useCallback(
    async (query: string): Promise<Array<Record<string, unknown>>> => {
      if (!db) {
        throw new Error("DuckDB is not initialized");
      }

      setIsLoading(true);
      setError(null);

      try {
        const conn = await db.connect();

        try {
          // Get token for fetching parquet files
          const token = await getToken();
          if (!token) {
            throw new Error("Authentication required");
          }

          // Register parquet files if we have them and query uses {DATA}
          const parquetParts: string[] = [];

          if (query.includes("{DATA}") && coldFilesRef.current.length > 0) {
            // Register each parquet file
            for (const file of coldFilesRef.current) {
              // Check if already registered
              if (registeredFiles.has(file.key)) {
                parquetParts.push(`'${registeredFiles.get(file.key)}'`);
                continue;
              }

              // Fetch the parquet file
              const proxyUrl = `${FILE_PROXY_WORKER_URL}/file/${encodeURIComponent(file.key)}`;
              const response = await fetch(proxyUrl, {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
              });

              if (!response.ok) {
                console.error(
                  `Failed to fetch ${file.key}: ${response.status}`,
                );
                continue;
              }

              const buffer = await response.arrayBuffer();
              const stableFileName = getStableFileName(file.key);

              // Register in DuckDB
              await db.registerFileBuffer(
                stableFileName,
                new Uint8Array(buffer),
              );
              registeredFiles.set(file.key, stableFileName);
              parquetParts.push(`'${stableFileName}'`);
            }
          }

          // Build the data source
          let dataSource: string;
          if (parquetParts.length > 0) {
            dataSource = `read_parquet([${parquetParts.join(", ")}])`;
          } else {
            // Fallback: try to use any available data
            dataSource = "(SELECT 1 as dummy WHERE false)"; // Empty table
          }

          // Replace {DATA} placeholder with actual data source
          const finalQuery = query.replace(/\{DATA\}/g, dataSource);

          console.log("[ChartQuery] Executing:", finalQuery);

          // Execute the query
          const result = await conn.query(finalQuery);

          // Convert Arrow table to JSON
          const rows: Array<Record<string, unknown>> = [];
          const schema = result.schema.fields;

          for (let i = 0; i < result.numRows; i++) {
            const row: Record<string, unknown> = {};
            for (const field of schema) {
              const column = result.getChild(field.name);
              if (column) {
                const value = column.get(i);
                // Convert BigInt to Number for Recharts compatibility
                row[field.name] =
                  typeof value === "bigint" ? Number(value) : value;
              }
            }
            rows.push(row);
          }

          setData(rows);
          return rows;
        } finally {
          await conn.close();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [db, getToken],
  );

  return {
    data,
    isLoading: isLoading || dbLoading,
    error,
    execute,
    setFiles,
  };
}

/**
 * Get the schema of registered tables for AI context
 */
export async function getTableSchema(
  db: Awaited<ReturnType<typeof useDuckDB>>["db"],
): Promise<string> {
  if (!db) return "";

  // Return static schema since we know the parquet structure
  return `Analytics Data (use {DATA} as table name):
- occurred_at: TIMESTAMP (when click happened)
- country: VARCHAR (country code: US, IN, GB, etc.)
- device: VARCHAR (Desktop, Mobile, Tablet)
- browser: VARCHAR (Chrome, Safari, Firefox, etc.)
- os: VARCHAR (Windows, iOS, macOS, Android, Linux)
- short_url: VARCHAR (shortened URL path)
- link_slug: VARCHAR (link identifier)
- referer: VARCHAR (referring website URL)
- utm_source, utm_medium, utm_campaign, utm_term, utm_content: VARCHAR (UTM parameters)
- is_bot: BOOLEAN (whether click is from bot)`;
}

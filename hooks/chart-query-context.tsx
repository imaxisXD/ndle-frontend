/**
 * Chart Query Context
 *
 * Provides shared DuckDB instance and cold files to all chart components.
 * This ensures all components can query the same data without separate initialization.
 */

"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDuckDB } from "./use-duckdb";
import { useAuth } from "@clerk/nextjs";
import type { ColdFile } from "@/types/analytics-v2";

interface ChartQueryContextValue {
  execute: (query: string) => Promise<Array<Record<string, unknown>>>;
  isLoading: boolean;
  error: Error | null;
  setFiles: (files: ColdFile[]) => void;
  isReady: boolean;
  filesVersion: number;
}

export interface ChartScopeFilters {
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  link?: string;
  excludeBots?: boolean;
}

export interface ChartScopeDateRange {
  start?: string;
  end?: string;
}

const ChartQueryContext = createContext<ChartQueryContextValue | null>(null);

const FILE_PROXY_WORKER_URL =
  process.env.NEXT_PUBLIC_FILE_PROXY_URL ||
  "https://proxy-file-worker.sunny735084.workers.dev";

// Cache for registered files (global to avoid re-registering)
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

function getFilesSignature(files: ColdFile[]): string {
  return files
    .map((file) => `${file.key}:${file.size}`)
    .sort()
    .join("|");
}

function sanitizeSQLValue(value: string): string {
  return value.replace(/'/g, "''");
}

function resolveColumn(
  columns: Set<string>,
  candidates: string[],
): string | null {
  for (const candidate of candidates) {
    if (columns.has(candidate)) return candidate;
  }
  return null;
}

function buildScopeWhereClause(
  columns: Set<string>,
  filters: ChartScopeFilters,
): string {
  const conditions: string[] = [];

  if (filters.country && filters.country !== "all" && columns.has("country")) {
    conditions.push(`country = '${sanitizeSQLValue(filters.country)}'`);
  }

  const deviceColumn = resolveColumn(columns, ["device", "device_type"]);
  if (
    filters.device &&
    filters.device !== "all" &&
    deviceColumn
  ) {
    conditions.push(
      `LOWER(${deviceColumn}) = LOWER('${sanitizeSQLValue(filters.device)}')`,
    );
  }

  if (filters.browser && filters.browser !== "all" && columns.has("browser")) {
    conditions.push(
      `LOWER(browser) LIKE LOWER('%${sanitizeSQLValue(filters.browser)}%')`,
    );
  }

  if (filters.os && filters.os !== "all" && columns.has("os")) {
    conditions.push(`LOWER(os) LIKE LOWER('%${sanitizeSQLValue(filters.os)}%')`);
  }

  if (filters.link && filters.link !== "all") {
    const sanitizedLink = sanitizeSQLValue(filters.link);
    const hasShortUrl = columns.has("short_url");
    const hasLinkSlug = columns.has("link_slug");
    if (hasShortUrl && hasLinkSlug) {
      conditions.push(
        `(short_url = '${sanitizedLink}' OR link_slug = '${sanitizedLink}')`,
      );
    } else if (hasShortUrl) {
      conditions.push(`short_url = '${sanitizedLink}'`);
    } else if (hasLinkSlug) {
      conditions.push(`link_slug = '${sanitizedLink}'`);
    }
  }

  if (filters.excludeBots && columns.has("is_bot")) {
    conditions.push("is_bot = false");
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

interface ChartQueryProviderProps {
  children: React.ReactNode;
  coldFiles?: ColdFile[];
  hotFile?: ColdFile | null;
  scopeFilters?: ChartScopeFilters;
  scopeDateRange?: ChartScopeDateRange;
}

export function ChartQueryProvider({
  children,
  coldFiles = [],
  hotFile,
  scopeFilters = {},
  scopeDateRange,
}: ChartQueryProviderProps) {
  const { db, loading: dbLoading, error: dbError } = useDuckDB();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(dbError);
  const [filesVersion, setFilesVersion] = useState(0);
  const allFilesRef = useRef<ColdFile[]>([]);
  const filesSignatureRef = useRef("");
  const scopeSignature = useMemo(
    () =>
      JSON.stringify({
        filters: scopeFilters,
        range: scopeDateRange ?? null,
      }),
    [scopeFilters, scopeDateRange],
  );

  const applyFiles = useCallback((files: ColdFile[]) => {
    allFilesRef.current = files;
    const signature = getFilesSignature(files);
    if (signature !== filesSignatureRef.current) {
      filesSignatureRef.current = signature;
      setFilesVersion((prev) => prev + 1);
    }
  }, []);

  // Merge cold files + hot file into allFilesRef
  React.useEffect(() => {
    const files = [...coldFiles];
    if (hotFile) {
      files.push(hotFile);
    }
    applyFiles(files);
    console.log(
      "[ChartQueryContext] Files updated - cold:",
      coldFiles.length,
      "hot:",
      hotFile ? 1 : 0,
      "total:",
      files.length,
    );
  }, [applyFiles, coldFiles, hotFile]);

  const setFiles = useCallback((files: ColdFile[]) => {
    applyFiles(files);
  }, [applyFiles]);

  const execute = useCallback(
    async (query: string): Promise<Array<Record<string, unknown>>> => {
      if (!db) {
        throw new Error("DuckDB is not initialized");
      }

      setIsLoading(true);
      setError(null);

      try {
        // If files are not yet populated, try hydrating them from the same
        // analytics request used by the dashboard for the active time range.
        if (
          query.includes("{DATA}") &&
          allFilesRef.current.length === 0 &&
          scopeDateRange?.start &&
          scopeDateRange?.end
        ) {
          try {
            const params = new URLSearchParams({
              start: scopeDateRange.start,
              end: scopeDateRange.end,
            });
            const response = await fetch(`/api/analytics/v2?${params.toString()}`);
            if (response.ok) {
              const payload = (await response.json()) as {
                cold?: ColdFile[];
                hot?: ColdFile | null;
              };
              const hydratedFiles = [...(payload.cold ?? [])];
              if (payload.hot) {
                hydratedFiles.push(payload.hot);
              }
              if (hydratedFiles.length > 0) {
                applyFiles(hydratedFiles);
              }
            } else {
              console.warn(
                "[ChartQueryContext] Failed to hydrate files:",
                response.status,
              );
            }
          } catch (hydrateError) {
            console.warn(
              "[ChartQueryContext] File hydration request failed:",
              hydrateError,
            );
          }
        }

        // Avoid executing invalid SQL when data files are not ready yet.
        // Returning [] allows charts to render "No data available" instead
        // of throwing binder errors against a dummy schema.
        if (query.includes("{DATA}") && allFilesRef.current.length === 0) {
          console.log(
            "[ChartQueryContext] No parquet files available yet; skipping query",
          );
          return [];
        }

        const conn = await db.connect();

        try {
          // Get token for fetching parquet files
          const token = await getToken();
          if (!token) {
            throw new Error("Authentication required");
          }

          // Register parquet files if we have them and query uses {DATA}
          const parquetParts: string[] = [];

          console.log(
            "[ChartQueryContext] allFilesRef.current:",
            allFilesRef.current.length,
            "files",
          );
          console.log(
            "[ChartQueryContext] Query includes {DATA}:",
            query.includes("{DATA}"),
          );

          if (query.includes("{DATA}") && allFilesRef.current.length > 0) {
            // Register each parquet file
            for (const file of allFilesRef.current) {
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

          // If all file fetches failed, avoid binding queries to an invalid
          // dummy table that doesn't contain expected analytics columns.
          if (query.includes("{DATA}") && parquetParts.length === 0) {
            console.warn(
              "[ChartQueryContext] Failed to register parquet files; returning empty result",
            );
            return [];
          }

          // Build the data source
          const dataSource =
            parquetParts.length > 0
              ? `read_parquet([${parquetParts.join(", ")}])`
              : "(SELECT 1 as dummy WHERE false)";

          // Apply dashboard-level filter scope (not time range).
          let scopedDataSource = dataSource;
          if (query.includes("{DATA}")) {
            const schemaResult = await conn.query(
              `DESCRIBE SELECT * FROM ${dataSource} LIMIT 1`,
            );
            const availableColumns = new Set<string>();
            for (const row of Array.from(schemaResult.toArray())) {
              const json = row.toJSON() as { column_name?: string };
              if (json.column_name) {
                availableColumns.add(json.column_name);
              }
            }

            const scopeWhereClause = buildScopeWhereClause(
              availableColumns,
              scopeFilters,
            );
            if (scopeWhereClause) {
              scopedDataSource = `(SELECT * FROM ${dataSource} ${scopeWhereClause})`;
            }
          }

          // Replace {DATA} placeholder with actual data source
          const finalQuery = query.replace(/\{DATA\}/g, scopedDataSource);

          console.log("[ChartQueryContext] Executing:", finalQuery);

          // Execute the query
          const result = await conn.query(finalQuery);

          console.log(
            "[ChartQueryContext] Query result numRows:",
            result.numRows,
          );
          console.log(
            "[ChartQueryContext] Query result schema:",
            result.schema.fields.map((f) => f.name),
          );

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

          console.log("[ChartQueryContext] Parsed rows:", rows);

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
    [applyFiles, db, getToken, filesVersion, scopeSignature, scopeDateRange],
  );

  const isReady = !!db && !dbLoading;

  return (
    <ChartQueryContext.Provider
      value={{ execute, isLoading, error, setFiles, isReady, filesVersion }}
    >
      {children}
    </ChartQueryContext.Provider>
  );
}

/**
 * Hook to access the shared chart query context
 */
export function useChartQueryContext(): ChartQueryContextValue {
  const context = useContext(ChartQueryContext);
  if (!context) {
    throw new Error(
      "useChartQueryContext must be used within a ChartQueryProvider",
    );
  }
  return context;
}

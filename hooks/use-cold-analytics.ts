import { useMemo, useRef } from "react";
import { useDuckDB } from "./use-duckdb";
import type { ColdFile } from "@/types/analytics-v2";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  FILTER_CONFIGS,
  buildFullWhereClause,
  processFilterOptions,
  type FilterOption,
} from "@/lib/analytics-filters";

interface ColdAnalyticsData {
  clicksByDay: Record<string, number>;
  countryCounts: Record<string, number>;
  linkCounts: Record<string, number>;
  totalClicks: number;
  // Dynamic filter options derived from the data (keyed by filter id)
  filterOptions: Record<string, FilterOption[]>;
}

// Filter parameters for DuckDB queries
export interface ColdAnalyticsFilters {
  country?: string; // "all" or country code like "IN", "US"
  device?: string; // "all" or "desktop", "mobile", "tablet"
  browser?: string; // "all" or "chrome", "safari", etc.
  os?: string; // "all" or "macos", "windows", etc.
  link?: string; // "all" or specific short_url/link_slug
  excludeBots?: boolean; // true to filter out bots
}

// Worker URL for authenticated file access
const FILE_PROXY_WORKER_URL =
  process.env.NEXT_PUBLIC_FILE_PROXY_URL ||
  "https://proxy-file-worker.sunny735084.workers.dev";

// Module-level cache for parquet file buffers (persists across renders)
// Key: file.key, Value: ArrayBuffer
const parquetFileCache = new Map<string, ArrayBuffer>();

// Module-level registry of files already registered in DuckDB
// Key: file.key, Value: DuckDB filename
const registeredInDuckDB = new Map<string, string>();

// Generate stable filename from file key (hash-like)
function getStableFileName(key: string): string {
  // Use a simple hash to create stable, unique filenames
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `parquet_${Math.abs(hash).toString(36)}.parquet`;
}

export function useColdAnalytics(
  files: ColdFile[],
  filters: ColdAnalyticsFilters = {},
) {
  const { db, loading: dbLoading, error: dbError } = useDuckDB();
  const { getToken } = useAuth();
  const runIdRef = useRef(0);

  const fileKeys = useMemo(() => files.map((file) => file.key), [files]);
  const hasFiles = fileKeys.length > 0;
  const queryEnabled = !!db && !dbLoading && !dbError && hasFiles;

  const queryResult = useQuery<ColdAnalyticsData, Error>({
    queryKey: ["cold-analytics", fileKeys, filters],
    enabled: queryEnabled,
    placeholderData: keepPreviousData, // Keep showing old data while new filter loads
    queryFn: async () => {
      const t0 = performance.now();
      console.log("[ColdPerf] ═══════════════════════════════════════════");
      console.log("[ColdPerf] Starting cold analytics query...");
      console.log(`[ColdPerf] Files requested: ${files.length}`);
      console.log(
        `[ColdPerf] File keys:`,
        files.map((f) => f.key.slice(-30)),
      );
      console.log(`[ColdPerf] Registry size: ${registeredInDuckDB.size}`);
      console.log(`[ColdPerf] Cache size: ${parquetFileCache.size}`);

      if (!db) {
        throw new Error("DuckDB is not initialized");
      }

      // Get Clerk session token for authenticated Worker access
      const t1 = performance.now();
      const token = await getToken();
      const t2 = performance.now();
      console.log(`[ColdPerf] Clerk token fetch: ${(t2 - t1).toFixed(2)}ms`);

      if (!token) {
        throw new Error("Authentication required - no session token");
      }

      const conn = await db.connect();
      const t3 = performance.now();
      console.log(`[ColdPerf] DB connect: ${(t3 - t2).toFixed(2)}ms`);

      const fileNamesForQuery: string[] = [];

      try {
        const currentRunId = ++runIdRef.current;

        const t4 = performance.now();
        let alreadyRegisteredCount = 0;
        let cachedCount = 0;
        let fetchedCount = 0;

        // Process files - reuse already registered, cache hits, or fetch new
        for (const [index, f] of files.entries()) {
          const stableFileName = getStableFileName(f.key);

          // Check if already registered in DuckDB (best case - no work needed!)
          if (registeredInDuckDB.has(f.key)) {
            alreadyRegisteredCount++;
            fileNamesForQuery.push(`'${registeredInDuckDB.get(f.key)}'`);
            console.log(
              `[ColdPerf] [${currentRunId}] Already registered: ${f.key.slice(-30)}`,
            );
            continue;
          }

          let arrayBuffer: ArrayBuffer;

          // Check if file is in memory cache (need to register but not fetch)
          if (parquetFileCache.has(f.key)) {
            arrayBuffer = parquetFileCache.get(f.key)!;
            cachedCount++;
            console.log(
              `[ColdPerf] [${currentRunId}] Cache HIT for file ${index + 1}/${files.length}`,
            );
          } else {
            // Fetch from network
            const proxyUrl = `${FILE_PROXY_WORKER_URL}/file/${encodeURIComponent(f.key)}`;

            console.log(
              `[ColdPerf] [${currentRunId}] Fetching file ${index + 1}/${files.length}: ${f.key.slice(-40)}`,
            );

            const fetchStart = performance.now();
            const response = await fetch(proxyUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(
                `[ColdPerf] Failed to fetch file ${f.key}: ${response.status} - ${errorText}`,
              );
              throw new Error(
                `Failed to fetch analytics file: ${response.status}`,
              );
            }

            arrayBuffer = await response.arrayBuffer();

            // Store a COPY in cache (original gets detached when transferred to Web Worker)
            parquetFileCache.set(f.key, arrayBuffer.slice(0));
            fetchedCount++;

            const fetchEnd = performance.now();
            console.log(
              `[ColdPerf] File fetch complete: ${(fetchEnd - fetchStart).toFixed(2)}ms (${arrayBuffer.byteLength} bytes)`,
            );
          }

          // Register with DuckDB using stable filename
          await db.registerFileBuffer(
            stableFileName,
            new Uint8Array(arrayBuffer.slice(0)),
          );

          // Track registration so we can reuse next time
          registeredInDuckDB.set(f.key, stableFileName);
          fileNamesForQuery.push(`'${stableFileName}'`);
        }

        const t5 = performance.now();
        console.log(
          `[ColdPerf] Processed ${files.length} files: ${alreadyRegisteredCount} reused, ${cachedCount} cache-hit, ${fetchedCount} fetched (${(t5 - t4).toFixed(2)}ms)`,
        );

        const tableExpression = `read_parquet([${fileNamesForQuery.join(", ")}])`;

        // Build WHERE clause using config-driven function
        // Convert to Record<string, string> format expected by buildFullWhereClause
        const filterRecord: Record<string, string> = {
          country: filters.country || "all",
          device: filters.device || "all",
          browser: filters.browser || "all",
          os: filters.os || "all",
          link: filters.link || "all",
        };
        const whereClause = buildFullWhereClause(
          filterRecord,
          filters.excludeBots,
        );
        console.log(`[ColdPerf] Filters applied: ${whereClause || "(none)"}`);

        const t6 = performance.now();
        const dayQuery = `
          SELECT 
            strftime(cast(occurred_at as TIMESTAMP), '%Y-%m-%d') as day, 
            count(*) as count 
          FROM ${tableExpression} 
          ${whereClause}
          GROUP BY day
        `;
        const dayResult = await conn.query(dayQuery);
        const t7 = performance.now();
        console.log(`[ColdPerf] Day query: ${(t7 - t6).toFixed(2)}ms`);

        const clicksByDay: Record<string, number> = {};
        for (const row of dayResult.toArray()) {
          const r = row.toJSON();
          if (r.day) clicksByDay[r.day] = Number(r.count);
        }

        const t8 = performance.now();
        const countryQuery = `
          SELECT 
            coalesce(country, 'Unknown') as country, 
            count(*) as count 
          FROM ${tableExpression} 
          ${whereClause}
          GROUP BY country
        `;
        const countryResult = await conn.query(countryQuery);
        const t9 = performance.now();
        console.log(`[ColdPerf] Country query: ${(t9 - t8).toFixed(2)}ms`);

        const countryCounts: Record<string, number> = {};
        for (const row of countryResult.toArray()) {
          const r = row.toJSON();
          if (r.country) countryCounts[r.country] = Number(r.count);
        }

        const t10 = performance.now();
        const linkQuery = `
          SELECT 
            coalesce(short_url, link_slug) as url, 
            count(*) as count 
          FROM ${tableExpression} 
          ${whereClause}
          GROUP BY url
        `;
        const linkResult = await conn.query(linkQuery);
        const t11 = performance.now();
        console.log(`[ColdPerf] Link query: ${(t11 - t10).toFixed(2)}ms`);

        const linkCounts: Record<string, number> = {};
        for (const row of linkResult.toArray()) {
          const r = row.toJSON();
          if (r.url) linkCounts[r.url] = Number(r.count);
        }

        const t12 = performance.now();
        const totalQuery = `SELECT count(*) as count FROM ${tableExpression} ${whereClause}`;
        const totalResult = await conn.query(totalQuery);
        const t13 = performance.now();
        console.log(`[ColdPerf] Total query: ${(t13 - t12).toFixed(2)}ms`);

        const totalClicks = Number(totalResult.toArray()[0].toJSON().count);

        // --- Query for filter options using BATCHED UNION ALL ---
        // Single query instead of 5 sequential queries for better performance
        const t14 = performance.now();

        // Build UNION ALL query for all filter options at once
        const unionParts = FILTER_CONFIGS.map((config) => {
          const baseQuery = config.optionsQuery.replace(
            "{table}",
            tableExpression,
          );
          // Wrap each query to add a filter_id column for identification
          return `SELECT '${config.id}' as filter_id, * FROM (${baseQuery}) sub_${config.id}`;
        });
        const batchedQuery = unionParts.join(" UNION ALL ");

        const batchedResult = await conn.query(batchedQuery);

        // Group results by filter_id
        const rawValuesByFilter: Record<string, string[]> = {};
        for (const config of FILTER_CONFIGS) {
          rawValuesByFilter[config.id] = [];
        }

        for (const row of batchedResult.toArray()) {
          const rowData = row.toJSON();
          const filterId = rowData.filter_id as string;
          // Get the value (second column, after filter_id)
          const values = Object.values(rowData);
          const value = values.length > 1 ? (values[1] as string) : null;
          if (filterId && value && rawValuesByFilter[filterId]) {
            rawValuesByFilter[filterId].push(value);
          }
        }

        // Process each filter's values
        const filterOptionsResult: Record<string, FilterOption[]> = {};
        for (const config of FILTER_CONFIGS) {
          filterOptionsResult[config.id] = processFilterOptions(
            config.id,
            rawValuesByFilter[config.id],
          );
        }

        const t15 = performance.now();
        console.log(
          `[ColdPerf] Filter options query: ${(t15 - t14).toFixed(2)}ms`,
        );

        console.log(
          `[ColdPerf] ✅ TOTAL processing time: ${(t15 - t0).toFixed(2)}ms`,
        );

        return {
          clicksByDay,
          countryCounts,
          linkCounts,
          totalClicks,
          filterOptions: filterOptionsResult,
        };
      } finally {
        // Only close connection, keep files registered for reuse!
        await conn.close();
        console.log(`[ColdPerf] Connection closed (files kept registered)`);
      }
    },
    retry: 1,
  });

  // Empty data structure for when there are genuinely no files
  // Generate empty filter options from FILTER_CONFIGS for consistency
  const emptyFilterOptions: Record<string, FilterOption[]> = {};
  for (const config of FILTER_CONFIGS) {
    emptyFilterOptions[config.id] = [
      { value: "all", label: `All ${config.label}s` },
    ];
  }

  const emptyData: ColdAnalyticsData = {
    clicksByDay: {},
    countryCounts: {},
    linkCounts: {},
    totalClicks: 0,
    filterOptions: emptyFilterOptions,
  };

  // When no files in the request:
  // - If we're still fetching (isPending), show previous cached data to avoid flash
  // - If fetch completed (not pending), this filter genuinely has no data - show empty
  if (!hasFiles) {
    const isStillFetching = queryResult.isPending || queryResult.isFetching;
    return {
      data: isStillFetching ? (queryResult.data ?? null) : emptyData,
      loading: isStillFetching,
      error: dbError,
    };
  }

  return {
    data: queryResult.data ?? null,
    loading: queryEnabled
      ? queryResult.isFetching || queryResult.isPending
      : false,
    error: queryResult.error ?? dbError ?? null,
  };
}

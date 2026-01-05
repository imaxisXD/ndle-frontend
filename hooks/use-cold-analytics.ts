import { useMemo } from "react";
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
  filterOptions: Record<string, FilterOption[]>;
  // UTM Analytics
  utmSourceCounts: Record<string, number>;
  utmMediumCounts: Record<string, number>;
  utmCampaignCounts: Record<string, number>;
  utmTermCounts: Record<string, number>;
  utmContentCounts: Record<string, number>;
  utmMatrixCounts: Record<string, number>;
  utmWithCount: number;
  utmWithoutCount: number;
  // Referer Analytics
  refererCounts?: Record<string, number>;
  // Progressive loading state
  isPartialData: boolean;
}

export interface ColdAnalyticsFilters {
  country?: string;
  device?: string;
  browser?: string;
  os?: string;
  link?: string;
  excludeBots?: boolean;
}

const FILE_PROXY_WORKER_URL =
  process.env.NEXT_PUBLIC_FILE_PROXY_URL ||
  "https://proxy-file-worker.sunny735084.workers.dev";

// LRU Cache for parquet files
const MAX_CACHED_FILES = 30;
const parquetFileCache = new Map<string, ArrayBuffer>();
const registeredInDuckDB = new Map<string, string>();
const lruOrder: string[] = [];

// Track DuckDB instance to detect when registrations become stale
let lastDbInstance: unknown = null;

function getStableFileName(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `parquet_${Math.abs(hash).toString(36)}.parquet`;
}

function touchLRU(key: string): void {
  const idx = lruOrder.indexOf(key);
  if (idx > -1) lruOrder.splice(idx, 1);
  lruOrder.push(key);
}

function evictLRUIfNeeded(): string | null {
  if (parquetFileCache.size >= MAX_CACHED_FILES && lruOrder.length > 0) {
    const evictKey = lruOrder.shift()!;
    parquetFileCache.delete(evictKey);
    registeredInDuckDB.delete(evictKey);
    if (process.env.NODE_ENV === "development") {
      console.log(`[LRU] Evicted: ${evictKey.slice(-30)}`);
    }
    return evictKey;
  }
  return null;
}

// Helper to run analytics queries on a unified table
async function runAnalyticsQueries(
  conn: {
    query: (sql: string) => Promise<{
      toArray: () => ArrayLike<{ toJSON: () => Record<string, unknown> }>;
    }>;
  },
  unifiedTable: string,
  finalWhereClause: string,
  timezoneOffset?: number,
): Promise<{
  clicksByDay: Record<string, number>;
  countryCounts: Record<string, number>;
  linkCounts: Record<string, number>;
  totalClicks: number;
  filterOptions: Record<string, FilterOption[]>;
  utmSourceCounts: Record<string, number>;
  utmMediumCounts: Record<string, number>;
  utmCampaignCounts: Record<string, number>;
  utmTermCounts: Record<string, number>;
  utmContentCounts: Record<string, number>;
  utmMatrixCounts: Record<string, number>;
  utmWithCount: number;
  utmWithoutCount: number;
}> {
  const whereConnect = finalWhereClause ? "AND" : "WHERE";

  // Calculate day with timezone adjustment
  // timezoneOffset is in minutes (e.g. 330 for IST).
  const offsetString = timezoneOffset
    ? `INTERVAL '${timezoneOffset} minutes'`
    : "INTERVAL '0 minutes'";

  const [
    dayResult,
    countryResult,
    linkResult,
    totalResult,
    filterOptionsResult,
    utmSourceResult,
    utmMediumResult,
    utmCampaignResult,
    utmTermResult,
    utmContentResult,
    utmMatrixResult,
    utmCoverageResult,
  ] = await Promise.all([
    conn.query(
      `SELECT strftime(cast(occurred_at as TIMESTAMP) + ${offsetString}, '%Y-%m-%d') as day, count(*) as count FROM ${unifiedTable} ${finalWhereClause} GROUP BY day`,
    ),
    conn.query(
      `SELECT coalesce(country, 'Unknown') as country, count(*) as count FROM ${unifiedTable} ${finalWhereClause} GROUP BY country`,
    ),
    conn.query(
      `SELECT coalesce(short_url, link_slug) as url, count(*) as count FROM ${unifiedTable} ${finalWhereClause} GROUP BY url`,
    ),
    conn.query(
      `SELECT count(*) as count FROM ${unifiedTable} ${finalWhereClause}`,
    ),
    (async () => {
      const unionParts = FILTER_CONFIGS.map((config) => {
        const baseQuery = config.optionsQuery.replace("{table}", unifiedTable);
        return `SELECT '${config.id}' as filter_id, * FROM (${baseQuery}) sub_${config.id}`;
      });
      return conn.query(unionParts.join(" UNION ALL "));
    })(),
    conn.query(
      `SELECT coalesce(utm_source, 'Direct / None') as key, count(*) as cnt FROM ${unifiedTable} ${finalWhereClause} GROUP BY utm_source`,
    ),
    conn.query(
      `SELECT coalesce(utm_medium, 'None') as key, count(*) as cnt FROM ${unifiedTable} ${finalWhereClause} GROUP BY utm_medium`,
    ),
    conn.query(
      `SELECT coalesce(utm_campaign, 'No Campaign') as key, count(*) as cnt FROM ${unifiedTable} ${finalWhereClause} GROUP BY utm_campaign`,
    ),
    conn.query(
      `SELECT utm_term as key, count(*) as cnt FROM ${unifiedTable} ${finalWhereClause} ${whereConnect} utm_term IS NOT NULL AND utm_term != '' GROUP BY utm_term`,
    ),
    conn.query(
      `SELECT utm_content as key, count(*) as cnt FROM ${unifiedTable} ${finalWhereClause} ${whereConnect} utm_content IS NOT NULL AND utm_content != '' GROUP BY utm_content`,
    ),
    conn.query(
      `SELECT coalesce(utm_source, 'Direct') as src, coalesce(utm_medium, 'None') as med, count(*) as cnt FROM ${unifiedTable} ${finalWhereClause} GROUP BY utm_source, utm_medium`,
    ),
    conn.query(
      `SELECT CASE WHEN utm_source IS NOT NULL THEN 'with' ELSE 'without' END as cat, count(*) as cnt FROM ${unifiedTable} ${finalWhereClause} GROUP BY cat`,
    ),
  ]);

  // Process results
  const clicksByDay: Record<string, number> = {};
  for (const row of Array.from(dayResult.toArray())) {
    const r = row.toJSON() as { day: string; count: number };
    if (r.day) clicksByDay[r.day] = Number(r.count);
  }

  const countryCounts: Record<string, number> = {};
  for (const row of Array.from(countryResult.toArray())) {
    const r = row.toJSON() as { country: string; count: number };
    if (r.country) countryCounts[r.country] = Number(r.count);
  }

  const linkCounts: Record<string, number> = {};
  for (const row of Array.from(linkResult.toArray())) {
    const r = row.toJSON() as { url: string; count: number };
    if (r.url) linkCounts[r.url] = Number(r.count);
  }

  const totalClicks = Number(
    (Array.from(totalResult.toArray())[0]?.toJSON() as { count: number })
      ?.count ?? 0,
  );

  // Filter options
  const rawValuesByFilter: Record<string, string[]> = {};
  for (const config of FILTER_CONFIGS) {
    rawValuesByFilter[config.id] = [];
  }
  for (const row of Array.from(filterOptionsResult.toArray())) {
    const rowData = row.toJSON() as Record<string, unknown>;
    const filterId = rowData.filter_id as string;
    const values = Object.values(rowData);
    const value = values.length > 1 ? (values[1] as string) : null;
    if (filterId && value && rawValuesByFilter[filterId]) {
      rawValuesByFilter[filterId].push(value);
    }
  }
  const filterOptions: Record<string, FilterOption[]> = {};
  for (const config of FILTER_CONFIGS) {
    filterOptions[config.id] = processFilterOptions(
      config.id,
      rawValuesByFilter[config.id],
    );
  }

  // UTM processing
  const toUtmRecord = (result: {
    toArray: () => ArrayLike<{ toJSON: () => { key?: string; cnt?: number } }>;
  }) => {
    const rec: Record<string, number> = {};
    for (const row of Array.from(result.toArray())) {
      const r = row.toJSON();
      if (r.key) rec[r.key] = Number(r.cnt);
    }
    return rec;
  };

  const utmSourceCounts = toUtmRecord(utmSourceResult);
  const utmMediumCounts = toUtmRecord(utmMediumResult);
  const utmCampaignCounts = toUtmRecord(utmCampaignResult);
  const utmTermCounts = toUtmRecord(utmTermResult);
  const utmContentCounts = toUtmRecord(utmContentResult);

  const utmMatrixCounts: Record<string, number> = {};
  for (const row of Array.from(utmMatrixResult.toArray())) {
    const r = row.toJSON() as { src: string; med: string; cnt: number };
    utmMatrixCounts[`${r.src}|${r.med}`] = Number(r.cnt);
  }

  let utmWithCount = 0,
    utmWithoutCount = 0;
  for (const row of Array.from(utmCoverageResult.toArray())) {
    const r = row.toJSON() as { cat: string; cnt: number };
    if (r.cat === "with") utmWithCount = Number(r.cnt);
    else utmWithoutCount = Number(r.cnt);
  }

  return {
    clicksByDay,
    countryCounts,
    linkCounts,
    totalClicks,
    filterOptions,
    utmSourceCounts,
    utmMediumCounts,
    utmCampaignCounts,
    utmTermCounts,
    utmContentCounts,
    utmMatrixCounts,
    utmWithCount,
    utmWithoutCount,
  };
}

export function useColdAnalytics(
  files: ColdFile[],
  filters: ColdAnalyticsFilters = {},
  start?: string,
  end?: string,
  timezoneOffset: number = 0,
) {
  const { db, loading: dbLoading, error: dbError } = useDuckDB();
  const { getToken } = useAuth();

  const fileKeys = useMemo(() => files.map((file) => file.key), [files]);
  const hasFiles = fileKeys.length > 0;

  // Build WHERE clause (shared between queries)
  const finalWhereClause = useMemo(() => {
    const filterRecord: Record<string, string> = {
      country: filters.country || "all",
      device: filters.device || "all",
      browser: filters.browser || "all",
      os: filters.os || "all",
      link: filters.link || "all",
    };
    const whereClause = buildFullWhereClause(filterRecord, filters.excludeBots);

    let result = whereClause;
    if (start && end) {
      const dateFilter = `occurred_at >= '${start} 00:00:00' AND occurred_at <= '${end} 23:59:59.999'`;
      result = result ? `${result} AND ${dateFilter}` : `WHERE ${dateFilter}`;
    }
    return result;
  }, [filters, start, end]);

  // --- Cold Files Only Query ---
  const coldQueryEnabled = !!db && !dbLoading && !dbError && hasFiles;

  const coldResult = useQuery<ColdAnalyticsData, Error>({
    queryKey: ["analytics-cold", fileKeys, filters, start, end, timezoneOffset],
    enabled: coldQueryEnabled,
    placeholderData: keepPreviousData,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[ColdPerf] Phase 2: Full unified query...");
      }
      const t0 = performance.now();

      if (!db) throw new Error("DuckDB is not initialized");

      // Clear registeredInDuckDB if DB instance changed (registrations are stale)
      if (lastDbInstance !== db) {
        if (process.env.NODE_ENV === "development") {
          console.log("[ColdPerf] DB instance changed, clearing file registry");
        }
        registeredInDuckDB.clear();
        lastDbInstance = db;
      }

      const token = await getToken();
      if (!token) throw new Error("Authentication required");

      const conn = await db.connect();
      const coldTableParts: string[] = [];

      try {
        // Register cold parquet files with LRU (Parallel Fetch)
        // Fetch operations are parallelized to reduce latency (2.6s -> ~0.5s potentially)
        const fetchFile = async (f: ColdFile) => {
          try {
            if (parquetFileCache.has(f.key)) {
              touchLRU(f.key);
              return { key: f.key, buffer: parquetFileCache.get(f.key)! };
            }

            evictLRUIfNeeded();
            const proxyUrl = `${FILE_PROXY_WORKER_URL}/file/${encodeURIComponent(f.key)}`;

            if (process.env.NODE_ENV === "development") {
              // console.log(`[ColdPerf] 📡 Requesting ${f.key}`);
            }
            const t0 = performance.now();

            const response = await fetch(proxyUrl, {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok)
              throw new Error(`Failed to fetch ${f.key}: ${response.status}`);

            const buffer = await response.arrayBuffer();
            const t1 = performance.now();
            if (process.env.NODE_ENV === "development") {
              console.log(
                `[ColdPerf] ✅ Fetched ${f.key} (${(buffer.byteLength / 1024).toFixed(1)} KB) in ${(t1 - t0).toFixed(0)}ms`,
              );
            }

            parquetFileCache.set(f.key, buffer.slice(0));
            touchLRU(f.key);
            return { key: f.key, buffer };
          } catch (e) {
            console.error(`[ColdPerf] Error fetching file ${f.key}:`, e);
            throw e;
          }
        };

        const fileBuffers = await Promise.all(files.map(fetchFile));

        // Use sequential registration for now to ensure stability with DuckDB WASM
        for (const { key, buffer } of fileBuffers) {
          const stableFileName = getStableFileName(key);
          await db.registerFileBuffer(
            stableFileName,
            new Uint8Array(buffer.slice(0)),
          );
          registeredInDuckDB.set(key, stableFileName);
          coldTableParts.push(`'${stableFileName}'`);
        }

        const t1 = performance.now(); // After cold files registered

        // Check parquet schema and log it for debugging
        let parquetHasUserId = false;
        if (coldTableParts.length > 0) {
          try {
            const schemaResult = await conn.query(
              `DESCRIBE SELECT * FROM read_parquet([${coldTableParts[0]}]) LIMIT 1`,
            );
            const schemaRows = Array.from(schemaResult.toArray()).map(
              (r) => r.toJSON() as { column_name: string; column_type: string },
            );
            const cols = schemaRows.map((r) => r.column_name);
            parquetHasUserId = cols.includes("user_id");

            // Always log schema in development for debugging
            if (process.env.NODE_ENV === "development") {
              console.log(`[ColdPerf] ====== PARQUET SCHEMA ======`);
              console.log(`[ColdPerf] File: ${coldTableParts[0]}`);
              console.log(`[ColdPerf] Columns (${cols.length}):`, cols);
              console.log(`[ColdPerf] Full schema:`, schemaRows);
              console.log(`[ColdPerf] has user_id: ${parquetHasUserId}`);
              console.log(`[ColdPerf] has is_bot: ${cols.includes("is_bot")}`);
              console.log(
                `[ColdPerf] has occurred_at: ${cols.includes("occurred_at")}`,
              );
              console.log(`[ColdPerf] ==============================`);
            }
          } catch (e) {
            if (process.env.NODE_ENV === "development") {
              console.log(`[ColdPerf] Could not check parquet schema:`, e);
            }
          }
        }

        // Build unified table - just SELECT * from all sources
        const tableParts: string[] = [];

        if (coldTableParts.length > 0) {
          tableParts.push(
            `SELECT * FROM read_parquet([${coldTableParts.join(", ")}])`,
          );
        }

        if (tableParts.length === 0) {
          throw new Error("No data sources available");
        }

        const unifiedTable =
          tableParts.length === 1
            ? `(${tableParts[0]})`
            : `(${tableParts.join(" UNION ALL ")})`;

        const t2 = performance.now(); // After unified table built

        const results = await runAnalyticsQueries(
          conn,
          unifiedTable,
          finalWhereClause,
          timezoneOffset,
        );

        const t3 = performance.now(); // After query execution

        if (process.env.NODE_ENV === "development") {
          console.log(`[Analytics] 🚀 Cold Data Ready:
        - Files: ${files.length}
        - 📦 Register: ${(t1 - t0).toFixed(0)}ms
        - 🧩 Build Query: ${(t2 - t1).toFixed(0)}ms
        - 🔍 Query Exec: ${(t3 - t2).toFixed(0)}ms
        - ✅ Total: ${(t3 - t0).toFixed(0)}ms`);
        }

        return { ...results, isPartialData: false };
      } finally {
        await conn.close();
      }
    },
    retry: 1,
  });

  // Return: Prefer full data, fall back to hot-only for progressive loading
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
    utmSourceCounts: {},
    utmMediumCounts: {},
    utmCampaignCounts: {},
    utmTermCounts: {},
    utmContentCounts: {},
    utmMatrixCounts: {},
    utmWithCount: 0,
    utmWithoutCount: 0,
    refererCounts: {},
    isPartialData: false,
  };

  // Return cold data result
  const data = coldResult.data ?? null;
  const loading = coldResult.isFetching || coldResult.isPending;

  if (!hasFiles) {
    return { data: emptyData, loading: false, error: dbError };
  }

  return {
    data,
    loading,
    error: coldResult.error ?? dbError ?? null,
  };
}

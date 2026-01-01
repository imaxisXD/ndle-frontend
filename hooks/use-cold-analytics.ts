import { useMemo } from "react";
import { useDuckDB } from "./use-duckdb";
import type { ColdFile, HotDataRow } from "@/types/analytics-v2";
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

// Track hot data registration
let lastHotDataHash = "";
const HOT_DATA_FILENAME = "hot_events.json";

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
    console.log(`[LRU] Evicted: ${evictKey.slice(-30)}`);
    return evictKey;
  }
  return null;
}

function hashHotData(hotData: HotDataRow[]): string {
  if (!hotData || hotData.length === 0) return "empty";
  const first = hotData[0]?.idempotency_key || "";
  const last = hotData[hotData.length - 1]?.idempotency_key || "";
  return `${hotData.length}:${first}:${last}`;
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
  hotData?: HotDataRow[],
  timezoneOffset: number = 0,
) {
  const { db, loading: dbLoading, error: dbError } = useDuckDB();
  const { getToken } = useAuth();

  const fileKeys = useMemo(() => files.map((file) => file.key), [files]);
  const hotDataHash = useMemo(() => hashHotData(hotData || []), [hotData]);
  const hasFiles = fileKeys.length > 0;
  const hasHotData = hotData && hotData.length > 0;

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

  // --- PHASE 1: Hot Data Only (Fast) ---
  const hotOnlyQueryEnabled = !!db && !dbLoading && !dbError && hasHotData;

  const hotOnlyResult = useQuery<ColdAnalyticsData, Error>({
    queryKey: [
      "analytics-hot-only",
      hotDataHash,
      filters,
      start,
      end,
      timezoneOffset,
    ],
    enabled: hotOnlyQueryEnabled,
    staleTime: 0,
    gcTime: 1000 * 60 * 2,
    queryFn: async () => {
      if (process.env.NODE_ENV === "development") {
        console.log("[ColdPerf] Phase 1: Hot data only...");
      }
      const t0 = performance.now();

      if (!db) throw new Error("DuckDB is not initialized");

      // Clear registeredInDuckDB if DB instance changed
      if (lastDbInstance !== db) {
        if (process.env.NODE_ENV === "development") {
          console.log("[ColdPerf] DB instance changed, clearing file registry");
        }
        registeredInDuckDB.clear();
        lastHotDataHash = "";
        lastDbInstance = db;
      }

      const conn = await db.connect();

      try {
        // Register hot data with EXCLUDE to drop user_id
        if (hotDataHash !== lastHotDataHash) {
          const hotJson = JSON.stringify(hotData);
          const hotBuffer = new TextEncoder().encode(hotJson);
          await db.registerFileBuffer(HOT_DATA_FILENAME, hotBuffer);
          lastHotDataHash = hotDataHash;
        }

        // Query hot data only, using EXCLUDE to drop user_id
        const hotTable = `(SELECT * EXCLUDE (user_id) FROM read_json('${HOT_DATA_FILENAME}'))`;

        const results = await runAnalyticsQueries(
          conn,
          hotTable,
          finalWhereClause,
          timezoneOffset,
        );

        const t1 = performance.now();
        if (process.env.NODE_ENV === "development") {
          console.log(`[Analytics] ⚡️ Hot Data Ready (Phase 1):
        - Rows: ${hotData?.length || 0}
        - ⏱️ Time: ${(t1 - t0).toFixed(0)}ms`);
        }

        return { ...results, isPartialData: true };
      } finally {
        await conn.close();
      }
    },
  });

  // --- PHASE 2: Full Unified Query (Hot + Cold) ---
  const fullQueryEnabled =
    !!db && !dbLoading && !dbError && (hasFiles || hasHotData);

  const fullResult = useQuery<ColdAnalyticsData, Error>({
    queryKey: [
      "analytics-full",
      fileKeys,
      hotDataHash,
      filters,
      start,
      end,
      timezoneOffset,
    ],
    enabled: fullQueryEnabled,
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
        lastHotDataHash = ""; // Also reset hot data registration
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

        // Register hot data if changed
        if (hasHotData && hotDataHash !== lastHotDataHash) {
          const hotJson = JSON.stringify(hotData);
          const hotBuffer = new TextEncoder().encode(hotJson);
          await db.registerFileBuffer(HOT_DATA_FILENAME, hotBuffer);
          lastHotDataHash = hotDataHash;
        }

        // Check if parquet has user_id (new files will, old won't)
        let parquetHasUserId = false;
        if (coldTableParts.length > 0) {
          try {
            const schemaResult = await conn.query(
              `DESCRIBE SELECT * FROM read_parquet([${coldTableParts[0]}]) LIMIT 1`,
            );
            const cols = Array.from(schemaResult.toArray()).map(
              (r) => (r.toJSON() as { column_name: string }).column_name,
            );
            parquetHasUserId = cols.includes("user_id");
            if (process.env.NODE_ENV === "development") {
              console.log(
                `[ColdPerf] Parquet has user_id: ${parquetHasUserId}`,
              );
            }
          } catch (e) {
            console.log(`[ColdPerf] Could not check parquet schema:`, e);
          }
        }

        // Build unified table with EXCLUDE for backward compat
        const tableParts: string[] = [];

        if (coldTableParts.length > 0) {
          const coldSelect = parquetHasUserId
            ? `SELECT * EXCLUDE (user_id) FROM read_parquet([${coldTableParts.join(", ")}])`
            : `SELECT * FROM read_parquet([${coldTableParts.join(", ")}])`;
          tableParts.push(coldSelect);
        }

        if (hasHotData) {
          // Hot always has user_id, so always EXCLUDE it
          tableParts.push(
            `SELECT * EXCLUDE (user_id) FROM read_json('${HOT_DATA_FILENAME}')`,
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

        // Log simplified performance report
        if (process.env.NODE_ENV === "development") {
          console.log(`[Analytics] 🚀 Unified Data Ready:
        - Files: ${files.length} cold, ${hotData?.length || 0} hot rows
        - 📦 Register (Cold): ${(t1 - t0).toFixed(0)}ms
        - 🧩 Build Union: ${(t2 - t1).toFixed(0)}ms
        - 🔍 Query Exec: ${(t3 - t2).toFixed(0)}ms
        - ✅ Total Query Time: ${(t3 - t0).toFixed(0)}ms`);
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
    isPartialData: false,
  };

  // Progressive loading: show hot data first, then full when ready
  const data = fullResult.data ?? hotOnlyResult.data ?? null;
  const loading =
    fullResult.isFetching || fullResult.isPending || hotOnlyResult.isFetching;

  if (!hasFiles && !hasHotData) {
    return { data: emptyData, loading: false, error: dbError };
  }

  return {
    data,
    loading,
    error: fullResult.error ?? hotOnlyResult.error ?? dbError ?? null,
  };
}

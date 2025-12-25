import { useMemo, useRef } from "react";
import { useDuckDB } from "./use-duckdb";
import type { ColdFile } from "@/types/analytics-v2";
import * as duckdb from "@duckdb/duckdb-wasm";
import { useQuery } from "@tanstack/react-query";

interface ColdAnalyticsData {
  clicksByDay: Record<string, number>;
  countryCounts: Record<string, number>;
  linkCounts: Record<string, number>;
  totalClicks: number;
}

export function useColdAnalytics(files: ColdFile[]) {
  const { db, loading: dbLoading, error: dbError } = useDuckDB();
  const runIdRef = useRef(0);

  const fileUrls = useMemo(() => files.map((file) => file.url), [files]);
  const hasFiles = fileUrls.length > 0;
  const queryEnabled = !!db && !dbLoading && !dbError && hasFiles;

  const queryResult = useQuery<ColdAnalyticsData, Error>({
    queryKey: ["cold-analytics", fileUrls],
    enabled: queryEnabled,
    queryFn: async () => {
      const t0 = performance.now();
      console.log("[ColdPerf] Starting cold analytics query...");

      if (!db) {
        throw new Error("DuckDB is not initialized");
      }
      const conn = await db.connect();
      const t1 = performance.now();
      console.log(`[ColdPerf] DB connect: ${(t1 - t0).toFixed(2)}ms`);

      const fileNamesForQuery: string[] = [];
      const registeredFiles: string[] = [];
      try {
        const currentRunId = ++runIdRef.current;

        const t2 = performance.now();
        for (const [index, f] of files.entries()) {
          const proxyUrl = `https://proxy-file-worker.sunny735084.workers.dev/analytics/file?url=${encodeURIComponent(f.url)}`;

          const fileName = `remote_file_${currentRunId}_${index}.parquet`;
          await db.registerFileURL(
            fileName,
            proxyUrl,
            duckdb.DuckDBDataProtocol.HTTP,
            false,
          );
          registeredFiles.push(fileName);
          fileNamesForQuery.push(`'${fileName}'`);
        }
        const t3 = performance.now();
        console.log(
          `[ColdPerf] Register ${files.length} files: ${(t3 - t2).toFixed(2)}ms`,
        );

        const tableExpression = `read_parquet([${fileNamesForQuery.join(", ")}])`;

        const t4 = performance.now();
        const dayQuery = `
          SELECT 
            strftime(cast(occurred_at as TIMESTAMP), '%Y-%m-%d') as day, 
            count(*) as count 
          FROM ${tableExpression} 
          GROUP BY day
        `;
        const dayResult = await conn.query(dayQuery);
        const t5 = performance.now();
        console.log(
          `[ColdPerf] Day query (includes file fetch): ${(t5 - t4).toFixed(2)}ms`,
        );

        const clicksByDay: Record<string, number> = {};
        for (const row of dayResult.toArray()) {
          const r = row.toJSON();
          if (r.day) clicksByDay[r.day] = Number(r.count);
        }

        const t6 = performance.now();
        const countryQuery = `
          SELECT 
            coalesce(country, 'Unknown') as country, 
            count(*) as count 
          FROM ${tableExpression} 
          GROUP BY country
        `;
        const countryResult = await conn.query(countryQuery);
        const t7 = performance.now();
        console.log(`[ColdPerf] Country query: ${(t7 - t6).toFixed(2)}ms`);

        const countryCounts: Record<string, number> = {};
        for (const row of countryResult.toArray()) {
          const r = row.toJSON();
          if (r.country) countryCounts[r.country] = Number(r.count);
        }

        const t8 = performance.now();
        const linkQuery = `
          SELECT 
            coalesce(short_url, link_slug) as url, 
            count(*) as count 
          FROM ${tableExpression} 
          GROUP BY url
        `;
        const linkResult = await conn.query(linkQuery);
        const t9 = performance.now();
        console.log(`[ColdPerf] Link query: ${(t9 - t8).toFixed(2)}ms`);

        const linkCounts: Record<string, number> = {};
        for (const row of linkResult.toArray()) {
          const r = row.toJSON();
          if (r.url) linkCounts[r.url] = Number(r.count);
        }

        const t10 = performance.now();
        const totalQuery = `SELECT count(*) as count FROM ${tableExpression}`;
        const totalResult = await conn.query(totalQuery);
        const t11 = performance.now();
        console.log(`[ColdPerf] Total query: ${(t11 - t10).toFixed(2)}ms`);

        const totalClicks = Number(totalResult.toArray()[0].toJSON().count);

        console.log(
          `[ColdPerf] ✅ TOTAL processing time: ${(t11 - t0).toFixed(2)}ms`,
        );

        return {
          clicksByDay,
          countryCounts,
          linkCounts,
          totalClicks,
        };
      } finally {
        const t12 = performance.now();
        const unregisterPromises = registeredFiles.map(async (name) => {
          try {
            await db.dropFile(name);
          } catch {
            // Ignore unregister failures
          }
        });
        await Promise.all(unregisterPromises);
        await conn.close();
        const t13 = performance.now();
        console.log(`[ColdPerf] Cleanup: ${(t13 - t12).toFixed(2)}ms`);
      }
    },
    retry: 1,
  });

  if (!hasFiles) {
    return {
      data: null,
      loading: false,
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

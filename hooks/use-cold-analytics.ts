import { useMemo, useRef } from "react";
import { useDuckDB } from "./use-duckdb";
import type { ColdFile } from "@/types/analytics-v2";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

interface ColdAnalyticsData {
  clicksByDay: Record<string, number>;
  countryCounts: Record<string, number>;
  linkCounts: Record<string, number>;
  totalClicks: number;
}

// Worker URL for authenticated file access
const FILE_PROXY_WORKER_URL =
  process.env.NEXT_PUBLIC_FILE_PROXY_URL ||
  "https://proxy-file-worker.sunny735084.workers.dev";

export function useColdAnalytics(files: ColdFile[]) {
  const { db, loading: dbLoading, error: dbError } = useDuckDB();
  const { getToken } = useAuth();
  const runIdRef = useRef(0);

  const fileKeys = useMemo(() => files.map((file) => file.key), [files]);
  const hasFiles = fileKeys.length > 0;
  const queryEnabled = !!db && !dbLoading && !dbError && hasFiles;

  const queryResult = useQuery<ColdAnalyticsData, Error>({
    queryKey: ["cold-analytics", fileKeys],
    enabled: queryEnabled,
    queryFn: async () => {
      const t0 = performance.now();
      console.log("[ColdPerf] Starting cold analytics query...");

      if (!db) {
        throw new Error("DuckDB is not initialized");
      }

      // Get Clerk session token for authenticated Worker access
      const t1 = performance.now();
      console.log("[ColdPerf] Fetching Clerk token...");
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
      const registeredFiles: string[] = [];

      try {
        const currentRunId = ++runIdRef.current;

        const t4 = performance.now();

        // Fetch and register files with authentication
        for (const [index, f] of files.entries()) {
          // Construct authenticated Worker URL with file key in path
          const proxyUrl = `${FILE_PROXY_WORKER_URL}/file/${encodeURIComponent(f.key)}`;

          console.log(
            `[ColdPerf] [${currentRunId}] Fetching file ${index + 1}/${files.length}: ${f.key}`,
          );

          // Fetch the parquet file with Bearer token
          const fetchStart = performance.now();
          // Fetch with Bearer token - internal user ID is in JWT claims
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

          const fetchEnd = performance.now();
          console.log(
            `[ColdPerf] File fetch complete: ${(fetchEnd - fetchStart).toFixed(2)}ms`,
          );

          // Get file as ArrayBuffer and register with DuckDB
          const arrayBuffer = await response.arrayBuffer();
          const fileName = `remote_file_${currentRunId}_${index}.parquet`;

          await db.registerFileBuffer(fileName, new Uint8Array(arrayBuffer));

          registeredFiles.push(fileName);
          fileNamesForQuery.push(`'${fileName}'`);

          console.log(
            `[ColdPerf] Registered file: ${fileName} (${arrayBuffer.byteLength} bytes)`,
          );
        }

        const t5 = performance.now();
        console.log(
          `[ColdPerf] Fetch & register ${files.length} files: ${(t5 - t4).toFixed(2)}ms`,
        );

        const tableExpression = `read_parquet([${fileNamesForQuery.join(", ")}])`;

        const t6 = performance.now();
        const dayQuery = `
          SELECT 
            strftime(cast(occurred_at as TIMESTAMP), '%Y-%m-%d') as day, 
            count(*) as count 
          FROM ${tableExpression} 
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
        const totalQuery = `SELECT count(*) as count FROM ${tableExpression}`;
        const totalResult = await conn.query(totalQuery);
        const t13 = performance.now();
        console.log(`[ColdPerf] Total query: ${(t13 - t12).toFixed(2)}ms`);

        const totalClicks = Number(totalResult.toArray()[0].toJSON().count);

        console.log(
          `[ColdPerf] ✅ TOTAL processing time: ${(t13 - t0).toFixed(2)}ms`,
        );

        return {
          clicksByDay,
          countryCounts,
          linkCounts,
          totalClicks,
        };
      } finally {
        const t14 = performance.now();
        const unregisterPromises = registeredFiles.map(async (name) => {
          try {
            await db.dropFile(name);
          } catch {
            // Ignore unregister failures
          }
        });
        await Promise.all(unregisterPromises);
        await conn.close();
        const t15 = performance.now();
        console.log(`[ColdPerf] Cleanup: ${(t15 - t14).toFixed(2)}ms`);
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

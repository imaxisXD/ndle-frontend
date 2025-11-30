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
      if (!db) {
        throw new Error("DuckDB is not initialized");
      }
      const conn = await db.connect();
      const fileNamesForQuery: string[] = [];
      const registeredFiles: string[] = [];
      try {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const currentRunId = ++runIdRef.current;
        for (const [index, f] of files.entries()) {
          if (!origin) {
            throw new Error("Window origin unavailable for proxy registration");
          }
          const proxyUrl = `${origin}/api/analytics/v2/file?url=${encodeURIComponent(f.url)}`;
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

        const tableExpression = `read_parquet([${fileNamesForQuery.join(", ")}])`;

        const dayQuery = `
          SELECT 
            strftime(cast(occurred_at as TIMESTAMP), '%Y-%m-%d') as day, 
            count(*) as count 
          FROM ${tableExpression} 
          GROUP BY day
        `;
        const dayResult = await conn.query(dayQuery);
        const clicksByDay: Record<string, number> = {};
        for (const row of dayResult.toArray()) {
          const r = row.toJSON();
          if (r.day) clicksByDay[r.day] = Number(r.count);
        }

        const countryQuery = `
          SELECT 
            coalesce(country, 'Unknown') as country, 
            count(*) as count 
          FROM ${tableExpression} 
          GROUP BY country
        `;
        const countryResult = await conn.query(countryQuery);
        const countryCounts: Record<string, number> = {};
        for (const row of countryResult.toArray()) {
          const r = row.toJSON();
          if (r.country) countryCounts[r.country] = Number(r.count);
        }

        const linkQuery = `
          SELECT 
            coalesce(short_url, link_slug) as url, 
            count(*) as count 
          FROM ${tableExpression} 
          GROUP BY url
        `;
        const linkResult = await conn.query(linkQuery);
        const linkCounts: Record<string, number> = {};
        for (const row of linkResult.toArray()) {
          const r = row.toJSON();
          if (r.url) linkCounts[r.url] = Number(r.count);
        }

        const totalQuery = `SELECT count(*) as count FROM ${tableExpression}`;
        const totalResult = await conn.query(totalQuery);
        const totalClicks = Number(totalResult.toArray()[0].toJSON().count);

        return {
          clicksByDay,
          countryCounts,
          linkCounts,
          totalClicks,
        };
      } finally {
        const unregisterPromises = registeredFiles.map(async (name) => {
          try {
            await db.dropFile(name);
          } catch {
            // Ignore unregister failures
          }
        });
        await Promise.all(unregisterPromises);
        await conn.close();
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

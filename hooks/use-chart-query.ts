import type { useDuckDB } from "./use-duckdb";

/**
 * Get the schema of registered parquet tables for AI chart generation context.
 */
export async function getTableSchema(
  db: Awaited<ReturnType<typeof useDuckDB>>["db"],
): Promise<string> {
  if (!db) return "";

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

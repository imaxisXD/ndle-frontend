"use client";

import { useEffect } from "react";
import { initDuckDB } from "@/hooks/use-duckdb";

/**
 * Prefetches DuckDB WASM in the background when the app loads.
 * This component renders nothing - it just triggers the initialization.
 *
 * The singleton pattern in initDuckDB ensures:
 * - Only one initialization happens across the entire app
 * - Subsequent useDuckDB() calls reuse the cached instance
 * - No re-initialization on route changes
 */
export function DuckDBPrefetch() {
  useEffect(() => {
    // Use requestIdleCallback to prefetch during idle time,
    // so it doesn't block the initial page render
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(
        () => {
          initDuckDB().catch((err) => {
            console.warn(
              "[DuckDBPrefetch] Background initialization failed:",
              err,
            );
          });
        },
        { timeout: 5000 }, // Fallback after 5s if browser is busy
      );
    } else {
      // Fallback for Safari (use setTimeout)
      setTimeout(() => {
        initDuckDB().catch((err) => {
          console.warn(
            "[DuckDBPrefetch] Background initialization failed:",
            err,
          );
        });
      }, 1000);
    }
  }, []);

  return null;
}

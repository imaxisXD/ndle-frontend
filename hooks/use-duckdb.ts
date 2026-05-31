import * as duckdb from "@duckdb/duckdb-wasm";
import { useEffect, useState } from "react";

// Singleton promise to prevent multiple initializations
let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export async function initDuckDB() {
  if (dbPromise) {
    if (process.env.NODE_ENV === "development") {
      console.log("[DuckDB] Returning cached instance");
    }
    return dbPromise;
  }
  dbPromise = (async () => {
    if (process.env.NODE_ENV === "development") {
      console.log("[DuckDB] Starting initialization...");
    }

    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], {
        type: "text/javascript",
      }),
    );

    try {
      const worker = new Worker(worker_url);
      // Use ConsoleLogger only in development
      const logger =
        process.env.NODE_ENV === "development"
          ? new duckdb.ConsoleLogger()
          : new duckdb.VoidLogger();

      const db = new duckdb.AsyncDuckDB(logger, worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

      if (process.env.NODE_ENV === "development") {
        console.log("[DuckDB] Initialization complete!");
      }
      return db;
    } finally {
      URL.revokeObjectURL(worker_url);
    }
  })();

  try {
    return await dbPromise;
  } catch (error) {
    dbPromise = null;
    throw error;
  }
}

export function useDuckDB() {
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    initDuckDB()
      .then((instance) => {
        setDb(instance);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to initialize DuckDB:", err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return { db, loading, error };
}

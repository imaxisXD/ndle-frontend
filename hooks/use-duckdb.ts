import * as duckdb from "@duckdb/duckdb-wasm";
import { useEffect, useState } from "react";

// Singleton promise to prevent multiple initializations
let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export async function initDuckDB() {
  if (dbPromise) {
    console.log("[DuckDB] Returning cached instance");
    return dbPromise;
  }
  console.log("[DuckDB] Starting initialization...");

  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

  const worker_url = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], {
      type: "text/javascript",
    }),
  );

  const worker = new Worker(worker_url);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);

  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(worker_url);

  console.log("[DuckDB] Initialization complete!");
  dbPromise = Promise.resolve(db);
  return db;
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

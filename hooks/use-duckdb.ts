import type * as duckdb from "@duckdb/duckdb-wasm";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

let database: { account: string; promise: Promise<duckdb.AsyncDuckDB> } | null = null;

export function releaseDuckDB(account: string) {
  if (database?.account !== account) return;
  const previous = database;
  database = null;
  void previous.promise.then(db => db.terminate()).catch(() => {});
}

export function initDuckDB(account = "guest"): Promise<duckdb.AsyncDuckDB> {
  if (database?.account === account) return database.promise;
  if (database) releaseDuckDB(database.account);
  const promise = (async () => {
    const runtime = await import("@duckdb/duckdb-wasm");
    const bundle = await runtime.selectBundle(runtime.getJsDelivrBundles());
    const workerUrl = URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`], { type: "text/javascript" }));
    const worker = new Worker(workerUrl);
    try {
      const db = new runtime.AsyncDuckDB(new runtime.VoidLogger(), worker);
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      return db;
    } catch (error) {
      worker.terminate();
      throw error;
    } finally {
      URL.revokeObjectURL(workerUrl);
    }
  })();
  database = { account, promise };
  void promise.catch(() => { if (database?.promise === promise) database = null; });
  return promise;
}

export function useDuckDB() {
  const { userId, isLoaded } = useAuth();
  const [db, setDb] = useState<duckdb.AsyncDuckDB | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!isLoaded || !userId) return;
    let canceled = false;
    initDuckDB(userId).then(instance => {
      if (!canceled) { setDb(instance); setLoading(false); }
    }).catch(error => {
      if (!canceled) { setError(error); setLoading(false); }
    });
    return () => { canceled = true; };
  }, [userId, isLoaded]);
  return { db, loading, error };
}

/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import shardedCounter from "@convex-dev/sharded-counter/test";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./test.setup.ts"]);

export function createTestBackend() {
  const backend = convexTest(schema, modules);
  shardedCounter.register(backend);
  return backend;
}

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts", "lib/**/*.test.ts", "app/**/*.test.ts"],
    env: { GUEST_SESSION_SECRET: "local-test-secret-with-no-external-access" },
  },
});

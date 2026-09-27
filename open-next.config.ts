import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default {
  ...defineCloudflareConfig({
    // Serve prerendered pages from Workers Static Assets instead of rendering
    // them on every request. Read-only: nothing uses revalidation (ISR) today;
    // switch to the R2 cache if that changes.
    incrementalCache: staticAssetsIncrementalCache,
    enableCacheInterception: true,
  }),
  buildCommand: "npm run build",
};

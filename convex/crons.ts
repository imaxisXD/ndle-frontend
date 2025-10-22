import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up expired analytics cache entries daily. We delete entries older than 48h
// and process up to 200 per run. Adjust `maxAgeSeconds`/`batchSize` if needed.
crons.interval(
  "cleanup-analytics-cache",
  { hours: 24 },
  internal.analyticsCache.cleanupExpiredCache,
  {
    maxAgeSeconds: 48 * 60 * 60,
    batchSize: 200,
  },
);

export default crons;

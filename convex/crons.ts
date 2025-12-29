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

// Check pending custom domains every 2 minutes and update status
// when SSL becomes active. This provides a delightful UX where users
// see their domain go from "Pending" to "Active" automatically.
crons.interval(
  "check-pending-custom-domains",
  { minutes: 2 },
  internal.customDomains.checkAllPendingDomains,
);

export default crons;

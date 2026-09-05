import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check pending custom domains every 2 minutes and update status
// when SSL becomes active. This provides a delightful UX where users
// see their domain go from "Pending" to "Active" automatically.
crons.interval(
  "check-pending-custom-domains",
  { minutes: 2 },
  internal.customDomains.checkAllPendingDomains,
);

crons.interval(
  "adopt-existing-custom-domains",
  { hours: 24 },
  internal.domainSync.bootstrapDomains,
  { cursor: null },
);

crons.interval(
  "retry-service-updates",
  { minutes: 1 },
  internal.serviceSync.reconcile,
);

crons.interval(
  "backfill-architecture-records",
  { minutes: 1 },
  internal.architectureMigration.advance,
);
crons.interval(
  "trim-live-click-history",
  { minutes: 1 },
  internal.architectureMigration.trimLiveHistory,
);

crons.interval(
  "backfill-collection-members",
  { minutes: 1 },
  internal.collectionMangament.migrateCollectionMembers,
);

export default crons;

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check pending custom domains every 2 minutes and update status
// when SSL becomes active.
crons.interval(
  "check-pending-custom-domains",
  { minutes: 2 },
  internal.domainSync.queuePendingDomainPage,
  { cursor: null },
);

// Unverified custom domains expire 7 days after they were added.
crons.interval(
  "expire-unverified-custom-domains",
  { hours: 1 },
  internal.customDomains.expireUnverifiedDomains,
  {},
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
  "trim-live-click-history",
  { hours: 1 },
  internal.architectureMigration.trimLiveHistory,
);

export default crons;

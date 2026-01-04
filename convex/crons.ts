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

export default crons;

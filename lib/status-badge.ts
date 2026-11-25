export type StatusBadgeVariant = "green" | "yellow" | "red" | "default";

/** Map link health/moderation status strings to Badge color variants. */
export function getStatusBadgeVariant(status: string): StatusBadgeVariant {
  if (status === "healthy" || status === "healed") {
    return "green";
  }
  if (status === "error" || status === "disabled") {
    return "red";
  }
  if (status === "warning" || status === "overdue") {
    return "yellow";
  }
  return "default";
}

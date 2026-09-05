import type { AnalyticsMeta } from "@/types/analytics-v2";

export function AnalyticsHistoryNotice({
  history,
}: {
  history?: AnalyticsMeta["history"];
}) {
  if (history?.status !== "unverified") return null;
  const before = new Date(history.before);
  const cutoff = Number.isFinite(before.getTime())
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(before) + " UTC"
    : null;

  return (
    <div
      role="note"
      className="bg-muted/40 border-border rounded-lg border px-4 py-3 text-sm"
    >
      <p className="text-foreground font-medium">
        Historical data may be incomplete
      </p>
      <p className="text-muted-foreground mt-1">
        {cutoff ? `Counts before ${cutoff}` : "Some counts in this range"} were
        rebuilt from available records. Some earlier clicks may be missing, and
        old totals could not be fully verified.
      </p>
    </div>
  );
}

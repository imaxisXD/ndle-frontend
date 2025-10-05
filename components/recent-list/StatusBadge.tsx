import { CheckCircle2Icon, RefreshCwIcon, AlertCircleIcon } from "../icons";
import { STATUS_LABELS, type LinkStatus } from "./types";

export function StatusBadge({ status }: { status: LinkStatus }) {
  const icon =
    status === "healthy" ? (
      <CheckCircle2Icon className="h-4 w-4 text-success" />
    ) : status === "healed" ? (
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
    ) : (
      <AlertCircleIcon className="h-4 w-4 text-warning" />
    );
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span
        className={
          status === "healed"
            ? "inline-flex items-center gap-1.5 rounded-full bg-success-container px-2 py-0.5 font-mono text-xs text-foreground border border-success/30"
            : status === "healthy"
            ? "inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-success border border-success/25"
            : "inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 font-mono text-xs text-warning border border-warning/25"
        }
      >
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}

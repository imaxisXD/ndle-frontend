import { ShieldAlert, ShieldPlusIn } from "iconoir-react";

export function StatusBadge({ status }: { status: string }) {
  const icon =
    status === "healthy" ? (
      <ShieldPlusIn className="text-success h-4 w-4" />
    ) : status === "healed" ? (
      <span className="bg-success h-1.5 w-1.5 rounded-full" />
    ) : (
      <ShieldAlert className="text-warning h-4 w-4" />
    );
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span
        className={
          status === "healed"
            ? "bg-success-container text-foreground border-success/30 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
            : status === "healthy"
              ? "bg-secondary text-success border-success/25 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
              : "bg-secondary text-warning border-warning/25 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs"
        }
      >
        {status}
      </span>
    </div>
  );
}

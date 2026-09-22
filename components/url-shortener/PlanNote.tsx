import { SkeletonBone } from "@/components/ui/skeleton-bone";
import { cn } from "@/lib/utils";

export type PlanNoteState = "loading" | "free" | "pro";

const FREE_NOTE =
  "Free accounts can use simple settings here. Paid-only options will stay blocked when you save.";
const PRO_NOTE = "Your Pro plan includes every option below.";

/**
 * Plan note above Advanced Options. Both messages share one grid cell, so the
 * note is as tall as the longer one whatever the plan is, and the form does
 * not move when the plan loads.
 */
export function PlanNote({ state }: { state: PlanNoteState }) {
  return (
    <div className="text-muted-foreground grid text-xs">
      <p
        aria-hidden={state !== "free"}
        className={cn(
          "col-start-1 row-start-1",
          state !== "free" && "invisible",
        )}
      >
        {FREE_NOTE}
      </p>
      <p
        aria-hidden={state !== "pro"}
        className={cn(
          "col-start-1 row-start-1",
          state !== "pro" && "invisible",
        )}
      >
        {PRO_NOTE}
      </p>
      {state === "loading" ? (
        <span className="col-start-1 row-start-1 flex h-4 items-center">
          <SkeletonBone className="h-3 w-full max-w-md" />
        </span>
      ) : null}
    </div>
  );
}

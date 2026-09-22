import { SkeletonBone } from "@/components/ui/skeleton-bone";
import { cn } from "@/lib/utils";

export type PlanNoteState = "loading" | "free" | "pro";

/**
 * Free-plan note above Advanced Options. The note keeps its space while the
 * plan loads and for Pro accounts (where it is hidden), so the form does not
 * move when the plan arrives.
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
        Free accounts can use simple settings here. Paid-only options will stay
        blocked when you save.
      </p>
      {state === "loading" ? (
        <span className="col-start-1 row-start-1 flex h-4 items-center">
          <SkeletonBone className="h-3 w-full max-w-md" />
        </span>
      ) : null}
    </div>
  );
}

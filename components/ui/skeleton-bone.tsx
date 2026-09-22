import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Placeholder bar with a sweeping highlight (`.skel-bone` in app/globals.css).
 * `delay` offsets the sweep so neighbouring rows shimmer in sequence.
 */
export function SkeletonBone({
  className,
  delay = 0,
  onPage = false,
}: {
  className?: string;
  delay?: number;
  /** Sits on the page background instead of a card. */
  onPage?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "skel-bone block rounded-sm",
        onPage && "skel-bone-page",
        className,
      )}
      style={{ "--skel-delay": `${delay}ms` } as CSSProperties}
    />
  );
}

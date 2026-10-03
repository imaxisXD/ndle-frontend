import { SkeletonBone } from "@/components/ui/skeleton-bone";

const ROW_STAGGER_MS = 90;

/**
 * Loading rows on the same grid as UrlDataRow, so every row is exactly as
 * tall as a loaded one and nothing moves when the links arrive. Render inside
 * a UrlTableFrame so they follow its layout.
 */
export function UrlTableSkeletonRows({
  rows,
  delay = 0,
}: {
  rows: number;
  /** Where the sweep starts, so rows can continue a sequence above them. */
  delay?: number;
}) {
  return Array.from({ length: rows }, (_, row) => {
    const rowDelay = delay + row * ROW_STAGGER_MS;
    return (
      <div
        key={row}
        aria-hidden="true"
        className="glide-row bg-surface-inset border-border border-b last:border-b-0"
      >
        <div className="g-status self-center">
          <SkeletonBone className="h-6 w-16 rounded-md" delay={rowDelay} />
        </div>

        <div className="g-link flex h-8 items-center gap-2">
          <SkeletonBone className="size-8 rounded-full" delay={rowDelay} />
          <SkeletonBone className="h-4 w-32 max-w-full" delay={rowDelay} />
        </div>

        <div className="g-orig flex h-4 w-56 items-center">
          <SkeletonBone className="h-3 w-full opacity-60" delay={rowDelay} />
        </div>

        <div className="g-clicks">
          <div className="flex h-8 items-center">
            <SkeletonBone className="h-4 w-5" delay={rowDelay} />
          </div>
          <div className="flex h-4 items-center">
            <SkeletonBone className="h-3 w-14" delay={rowDelay} />
          </div>
        </div>

        <div className="g-created flex h-4 items-center">
          <SkeletonBone className="h-3 w-16" delay={rowDelay} />
        </div>

        <div className="g-actions flex h-8 items-center">
          <SkeletonBone className="size-5 rounded-full" delay={rowDelay} />
        </div>
      </div>
    );
  });
}

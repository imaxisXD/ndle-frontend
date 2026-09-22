import { SkeletonBone } from "@/components/ui/skeleton-bone";
import { TableCell, TableRow } from "@/components/ui/table";
import { urlTableColumnSize } from "./column-sizes";

const ROW_STAGGER_MS = 90;

/**
 * Loading rows with the same cell structure as UrlDataRow, so every row is
 * exactly as tall as a loaded one and nothing moves when the links arrive.
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
      <TableRow key={row} aria-hidden="true" className="bg-muted/30 h-14">
        <TableCell
          className="px-4 py-3"
          style={{ width: urlTableColumnSize.status }}
        >
          <div className="pl-2">
            <SkeletonBone className="h-6 w-16 rounded-md" delay={rowDelay} />
          </div>
        </TableCell>

        <TableCell
          className="px-4 py-3 align-top"
          style={{ width: urlTableColumnSize.shortUrl }}
        >
          <div className="w-full space-y-1">
            <div className="flex h-8 items-center gap-2">
              <SkeletonBone className="size-8 rounded-full" delay={rowDelay} />
              <SkeletonBone className="h-4 w-32 max-w-full" delay={rowDelay} />
            </div>
            <div className="flex h-4 items-center">
              <SkeletonBone
                className="h-3 w-56 max-w-full opacity-60"
                delay={rowDelay}
              />
            </div>
          </div>
        </TableCell>

        <TableCell
          className="px-4 py-3 align-top"
          style={{ width: urlTableColumnSize.separator }}
        />

        <TableCell
          className="px-4 py-3 align-top"
          style={{ width: urlTableColumnSize.clicks }}
        >
          <div className="flex flex-col items-start space-y-1">
            <div className="flex h-8 items-center pl-5">
              <SkeletonBone className="h-4 w-5" delay={rowDelay} />
            </div>
            <div className="flex h-4 items-center">
              <SkeletonBone className="h-3 w-14" delay={rowDelay} />
            </div>
          </div>
        </TableCell>

        <TableCell
          className="px-4 py-3 align-top"
          style={{ width: urlTableColumnSize.createdAt }}
        >
          <div className="flex h-8 items-center">
            <SkeletonBone className="h-3 w-16" delay={rowDelay} />
          </div>
        </TableCell>

        <TableCell
          className="px-4 py-3 align-top"
          style={{ width: urlTableColumnSize.actions }}
        >
          <div className="flex h-8 items-center">
            <SkeletonBone className="size-5 rounded-full" delay={rowDelay} />
          </div>
        </TableCell>
      </TableRow>
    );
  });
}

import { cn } from "@/lib/utils";

export const urlTableColumnSize = {
  actions: 40,
  clicks: 60,
  createdAt: 60,
  separator: 60,
  shortUrl: 180,
  status: 60,
} as const;

// Below this width the table scrolls sideways instead of squeezing columns
// until badges and links overlap.
export const urlTableStyle = {
  tableLayout: "fixed",
  width: "100%",
  minWidth: 680,
} as const;

type UrlTableColumnId = keyof typeof urlTableColumnSize;

// Below md the empty spacer column is dropped and the Options column sticks to
// the right edge, so the row menu stays reachable while the table scrolls.
const stickyActions =
  "max-md:sticky max-md:right-0 max-md:z-10 max-md:shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.18)]";

export function urlTableHeadClassName(columnId: string) {
  const id = columnId as UrlTableColumnId;
  return cn(
    "px-4 py-3",
    id === "separator" && "hidden md:table-cell",
    id === "actions" && cn(stickyActions, "max-md:bg-card"),
  );
}

export function urlTableCellClassName(columnId: UrlTableColumnId) {
  return cn(
    "px-4 py-3 align-top",
    columnId === "separator" && "hidden md:table-cell",
    // Opaque version of the row's bg-muted/30 so scrolled cells don't show through.
    columnId === "actions" &&
      cn(
        stickyActions,
        "max-md:bg-[color-mix(in_oklch,var(--muted)_30%,var(--card))]",
      ),
  );
}

import { type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";
import { type GlideLayout, useColumnGlide } from "./use-column-glide";

// The table picks its layout from its own width, not the window's, so it
// adapts the same way whether the sidebar is open or the window narrows.
const URL_TABLE_LAYOUTS: readonly GlideLayout[] = [
  { name: "wide", minWidth: 800 },
  { name: "columns", minWidth: 640 },
  { name: "stacked", minWidth: 0 },
];

/**
 * Holds the links table (or its loading and empty states) and switches its
 * layout as the width changes, gliding cells to their new places.
 */
export function UrlTableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  useColumnGlide(frameRef, URL_TABLE_LAYOUTS);

  return (
    <div ref={frameRef} className={cn("glide-table", className)}>
      {children}
    </div>
  );
}

/**
 * The column headings. When the table is narrow, clicks and created share
 * one column, so their headings sit together as "Clicks / Created".
 */
export function UrlTableHeader({
  status,
  shortUrl,
  clicks,
  createdAt,
  actions,
}: {
  status: ReactNode;
  shortUrl: ReactNode;
  clicks: ReactNode;
  createdAt: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div role="rowgroup">
      <div
        role="row"
        data-glide-row
        className="glide-head bg-card border-border h-10 border-b text-sm font-medium"
      >
        <span role="columnheader" className="g-status" data-glide>
          {status}
        </span>
        <span role="columnheader" className="g-link" data-glide>
          {shortUrl}
        </span>
        <span role="columnheader" className="g-clicks" data-glide>
          {clicks}
        </span>
        <span
          className="g-slash text-muted-foreground/60"
          aria-hidden="true"
          data-glide
        >
          /
        </span>
        <span role="columnheader" className="g-created" data-glide>
          {createdAt}
        </span>
        <span role="columnheader" className="g-actions">
          <span data-glide>{actions}</span>
        </span>
      </div>
    </div>
  );
}

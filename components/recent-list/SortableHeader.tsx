import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/base-tooltip";
import { type Column } from "@tanstack/react-table";
import type { DisplayUrl } from "./types";
import { ArrowsUpFromLine, DataTransferDown } from "iconoir-react";

export function SortableHeader({
  column,
  label,
  ascTooltip,
  descTooltip,
  defaultTooltip,
}: {
  column: Column<DisplayUrl, unknown>;
  label: string;
  ascTooltip: string;
  descTooltip: string;
  defaultTooltip: string;
}) {
  const isSorted = column.getIsSorted();
  const tooltipText =
    isSorted === "desc"
      ? descTooltip
      : isSorted === "asc"
        ? ascTooltip
        : defaultTooltip;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={() => column.toggleSorting(isSorted === "asc")}
            className="hover:text-foreground flex items-center gap-2 text-sm font-medium"
          />
        }
      >
        <span>{label}</span>
        <span
          className={`inline-flex w-4 justify-center ${
            isSorted ? "text-accent" : "text-muted-foreground/60"
          }`}
        >
          {isSorted === "asc" ? (
            <span aria-hidden className="leading-none">
              ↑
            </span>
          ) : isSorted === "desc" ? (
            <span aria-hidden className="leading-none">
              ↓
            </span>
          ) : (
            <DataTransferDown className="size-4" />
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

import React from "react";
import { FilterAlt, XmarkCircle } from "iconoir-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useUrlListContext } from "./UrlListContext";
import { STATUS_LABELS, type LinkStatus } from "./types";

export function UrlListFilters() {
  const {
    statusFilter,
    setStatusFilter,
    showFiltersPanel,
    setShowFiltersPanel,
  } = useUrlListContext();
  const statusLabel = (status: LinkStatus) => STATUS_LABELS[status];

  return (
    <div className="border-border border-b p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Filters</h3>
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={() => setShowFiltersPanel(!showFiltersPanel)}
          className={`hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
            showFiltersPanel || statusFilter !== "all"
              ? "bg-foreground text-background"
              : "border-border hover:bg-accent border"
          }`}
        >
          <FilterAlt className="size-4.5" />
          Filters
        </Button>
      </div>

      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
          showFiltersPanel ? "max-h-64" : "max-h-0"
        }`}
        aria-hidden={!showFiltersPanel}
      >
        <div className="bg-muted/30 border-border mt-4 flex flex-wrap gap-3 rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Status:
            </span>
            <div className="flex gap-2">
              {["all", "healthy", "healed", "checking"].map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => setStatusFilter(status as LinkStatus | "all")}
                  className={`rounded-md px-3 py-1 text-xs transition-colors ${
                    statusFilter === status
                      ? "bg-foreground text-background"
                      : "bg-background border-border hover:bg-accent border"
                  }`}
                >
                  {status === "all" ? "All" : statusLabel(status as LinkStatus)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <UrlListActiveFilters />
    </div>
  );
}

function UrlListActiveFilters() {
  const { searchQuery, statusFilter, setSearchQuery, setStatusFilter } =
    useUrlListContext();
  const statusLabel = (status: LinkStatus) => STATUS_LABELS[status];

  if (!searchQuery && statusFilter === "all") return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs">Active filters:</span>
      {searchQuery && (
        <div className="inline-flex items-center">
          <Badge variant="primary">Search: {searchQuery}</Badge>
          <Button
            size="icon"
            variant="link"
            type="button"
            onClick={() => setSearchQuery("")}
            className="p-1 hover:text-red-500"
          >
            <XmarkCircle className="size-4" />
          </Button>
        </div>
      )}
      {statusFilter !== "all" && (
        <div className="inline-flex items-center">
          <Badge variant="primary">
            Status: {statusLabel(statusFilter as LinkStatus)}
          </Badge>
          <Button
            variant="link"
            type="button"
            size="icon"
            onClick={() => setStatusFilter("all")}
            className="p-1 hover:text-red-500"
          >
            <XmarkCircle className="size-4" />
          </Button>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setSearchQuery("");
          setStatusFilter("all");
        }}
        className="text-muted-foreground hover:text-foreground text-xs underline"
      >
        Clear all
      </button>
    </div>
  );
}

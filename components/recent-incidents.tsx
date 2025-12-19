"use client";

import { useState } from "react";
import {
  ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { Badge } from "@ui/badge";

import { Skeleton } from "./ui/skeleton";

export type Incident = {
  id: string;
  link: string;
  type: "error" | "warning" | "resolved";
  message: string;
  time: string;
};

const getIncidentCardStyles = (type: Incident["type"]) => {
  const baseStyles = "flex items-start gap-4 rounded-lg border p-4";

  switch (type) {
    case "warning":
      return `${baseStyles} bg-white border-amber-400/60 relative overflow-hidden before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(251,191,36,0.12)_10px,rgba(251,191,36,0.12)_20px)] before:[mask-image:linear-gradient(to_right,white,transparent_70%)] before:pointer-events-none`;
    case "error":
      return `${baseStyles} bg-white border-red-400/60 relative overflow-hidden before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(239,68,68,0.1)_10px,rgba(239,68,68,0.1)_20px)] before:[mask-image:linear-gradient(to_right,white,transparent_70%)] before:pointer-events-none`;
    case "resolved":
      return `${baseStyles} border-border bg-white`;
    default:
      return `${baseStyles} border-border bg-white`;
  }
};

function IncidentCardSkeleton() {
  return (
    <div className="border-border flex items-start gap-4 rounded-lg border bg-white p-4">
      <div className="flex-1">
        <div className="flex items-center gap-8">
          <Skeleton className="h-6 w-20 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

const columns: ColumnDef<Incident>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const incident = row.original;
      return (
        <div className="w-20">
          <Badge
            variant={
              incident.type === "error"
                ? "red"
                : incident.type === "warning"
                  ? "yellow"
                  : "green"
            }
            label={
              incident.type.charAt(0).toUpperCase() + incident.type.slice(1)
            }
          />
        </div>
      );
    },
  },
  {
    accessorKey: "link",
    header: "Link",
    cell: ({ row }) => (
      <code className="text-sm font-medium">{row.original.link}</code>
    ),
  },
  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) => (
      <p className="text-muted-foreground text-sm">{row.original.message}</p>
    ),
  },
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => (
      <p className="text-muted-foreground text-right text-xs">
        {row.original.time}
      </p>
    ),
  },
];

interface RecentIncidentsProps {
  incidents: Array<Incident>;
  defaultPageSize?: number;
  isLoading?: boolean;
}

export function RecentIncidents({
  incidents,
  defaultPageSize = 5,
  isLoading = false,
}: RecentIncidentsProps) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const table = useReactTable({
    data: incidents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
  });

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="border-border bg-card rounded-md border p-6">
      <div className="mb-6">
        <h3 className="text-base font-medium">Recent Incidents</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Latest monitoring alerts and issues
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: defaultPageSize }).map((_, idx) => (
            <IncidentCardSkeleton key={idx} />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No incidents recorded yet
        </p>
      ) : (
        <>
          {/* Card-based rows */}
          <div className="space-y-3">
            {table.getRowModel().rows.map((row) => {
              const incident = row.original;
              return (
                <div
                  key={row.id}
                  className={getIncidentCardStyles(incident.type)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-8">
                      {flexRender(
                        columns[0].cell,
                        row.getVisibleCells()[0].getContext(),
                      )}
                      <div className="flex flex-col gap-1">
                        {flexRender(
                          columns[1].cell,
                          row.getVisibleCells()[1].getContext(),
                        )}
                        {flexRender(
                          columns[2].cell,
                          row.getVisibleCells()[2].getContext(),
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm">Occurred</p>
                    {flexRender(
                      columns[3].cell,
                      row.getVisibleCells()[3].getContext(),
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {pageCount > 1 && (
            <div className="border-border mt-6 flex items-center justify-between border-t pt-4">
              <div className="text-muted-foreground text-xs">
                {pagination.pageIndex * pagination.pageSize + 1} -{" "}
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  incidents.length,
                )}{" "}
                of {incidents.length} incidents
              </div>
              <span className="text-xs">
                Page {currentPage} of {pageCount}
              </span>
              <div className="flex items-center gap-4">
                {/* Page info */}

                {/* Prev/Next buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

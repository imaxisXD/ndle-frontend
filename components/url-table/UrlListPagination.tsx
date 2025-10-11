import React from "react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/base-select";
import { useUrlListContext } from "./UrlListContext";

export function UrlListPagination() {
  const { table, isLoading, isEmpty, filteredUrls } = useUrlListContext();

  return (
    <div className="px-6 py-5">
      {!isLoading && !isEmpty && filteredUrls.length > 0 ? (
        <div className="flex items-center justify-end gap-6">
          <div className="flex items-center gap-2">
            <p className="text-sm">Links per page</p>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(value) => table.setPageSize(Number(value))}
            >
              <SelectTrigger className="px-3">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 30, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </span>
            <Select
              value={String(table.getState().pagination.pageIndex + 1)}
              onValueChange={(value) => table.setPageIndex(Number(value) - 1)}
            >
              <SelectTrigger className="px-2">
                <SelectValue placeholder="Page" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: table.getPageCount() }).map((_, idx) => (
                  <SelectItem key={idx} value={String(idx + 1)}>
                    {idx + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
      ) : (
        <div className="h-[32px]" />
      )}
    </div>
  );
}

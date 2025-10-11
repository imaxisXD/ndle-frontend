import React, { Fragment } from "react";
import { flexRender } from "@tanstack/react-table";
import { Search } from "iconoir-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ExpandedRowContent } from "./ExpandedRowContent";
import { useUrlListContext } from "./UrlListContext";

export function UrlListTable() {
  const {
    isLoading,
    isEmpty,
    filteredUrls,
    table,
    expandedId,
    setExpandedId,
    activeTab,
    setActiveTab,
  } = useUrlListContext();

  const pageSize = table.getState().pagination.pageSize;
  const columns = table.getAllColumns();

  return (
    <div className="border-border border-b">
      {isLoading ? (
        <Table>
          <TableHeader className="bg-card sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="px-4 py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {Array.from({ length: pageSize }).map((_, i) => (
              <TableRow key={`skeleton-${i}`} className="h-14">
                {Array.from({ length: columns.length }).map((__, j) => (
                  <TableCell key={`sk-${i}-${j}`} className="px-4 py-3">
                    <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : isEmpty || filteredUrls.length === 0 ? (
        <Table>
          <TableHeader className="bg-card sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="px-4 py-3">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} className="my-auto">
                <div className="my-auto p-12 text-center">
                  <Search className="text-muted-foreground mx-auto h-34 w-12" />
                  <h3 className="mt-4 text-sm font-medium">No links found</h3>
                  <p className="text-muted-foreground mt-2 h-64 text-xs">
                    Create your first shortened link to get started
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      ) : (
        <Table>
          <TableHeader className="bg-card sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} className="px-4 py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const url = row.original;
              const isExpandedRow = expandedId === url.id;

              return (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => setExpandedId(isExpandedRow ? null : url.id)}
                    className="odd:bg-background even:bg-muted/30 h-14 cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>

                  {isExpandedRow && (
                    <ExpandedRowContent
                      columnsCount={columns.length}
                      url={url}
                      activeTab={activeTab}
                      setActiveTab={setActiveTab}
                    />
                  )}
                </Fragment>
              );
            })}
            {Array.from({
              length: Math.max(0, pageSize - table.getRowModel().rows.length),
            }).map((_, i) => (
              <TableRow key={`pad-data-${i}`} className="h-14">
                {Array.from({ length: columns.length }).map((__, j) => (
                  <TableCell
                    key={`pad-d-${i}-${j}`}
                    className="px-4 py-3 opacity-0"
                  >
                    &nbsp;
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

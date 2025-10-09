"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { useNavigate } from "react-router";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/base-select";

import { Badge } from "@ui/badge";
import { ShortUrlCell } from "./recent-list/ShortUrlCell";
import { SortableHeader } from "./recent-list/SortableHeader";
import { ExpandedRowContent } from "./recent-list/ExpandedRowContent";
import {
  STATUS_LABELS,
  type LinkStatus,
  type DisplayUrl,
} from "./recent-list/types";
import { FilterAlt, MoreVertCircle, Search, XmarkCircle } from "iconoir-react";
import { FunctionReturnType } from "convex/server";
import { Button } from "./ui/button";

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// const mockUrls: Array<DisplayUrl> = [
//   {
//     id: "mock-1",
//     shortUrl: "ndle.im/a8x9k2",
//     originalUrl: "https://example.com/blog/how-to-build-a-saas-product",
//     clicks: 342,
//     createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
//     status: "healthy" as const,
//     healingHistory: [
//       {
//         date: "1 week ago",
//         action: "Detected slow response time",
//       },
//       {
//         date: "1 week ago",
//         action: "Cached via Wayback Machine as backup",
//       },
//     ],
//     memory: {
//       summary:
//         "Analytics dashboard features including real-time metrics, custom reports, and data export capabilities.",
//       notes: "Inspiration for our own dashboard redesign",
//       savedReason: "UI/UX research",
//     },
//   },
// ];

export function UrlList() {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "memory" | "chat" | "healing" | "analytics"
  >("memory");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LinkStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { add } = useToast();

  const urls = useQuery(api.urlMainFuction.getUserUrlsWithAnalytics);
  type UserUrlsResponse = NonNullable<
    FunctionReturnType<typeof api.urlMainFuction.getUserUrlsWithAnalytics>
  >;

  const isLoading = urls === undefined;
  const isEmpty = urls === null || (Array.isArray(urls) && urls.length === 0);

  const filteredUrls = useMemo(() => {
    if (!Array.isArray(urls) || urls.length === 0) {
      return [] as Array<DisplayUrl>;
    }

    const typedUrls = urls as UserUrlsResponse;
    const displayUrls = typedUrls.map((doc) => {
      const slugSource = doc.slugAssigned ?? doc.shortUrl;
      const formattedShortUrl = slugSource
        ? slugSource.startsWith("http")
          ? slugSource
          : `ndle.im/${slugSource.replace(/^\/+/, "")}`
        : "";

      const message = (doc.urlStatusMessage ?? "").toLowerCase();
      const status: LinkStatus = message.includes("success")
        ? "healthy"
        : message.includes("heal")
          ? "healed"
          : "checking";

      return {
        id: doc._id,
        shortUrl: formattedShortUrl || doc.shortUrl,
        originalUrl: doc.fullurl,
        clicks: doc.analytics?.totalClickCounts ?? 0,
        createdAt: doc._creationTime,
        status,
      } satisfies DisplayUrl;
    });

    let filtered: Array<DisplayUrl> = displayUrls;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (url) =>
          url.shortUrl.toLowerCase().includes(query) ||
          url.originalUrl.toLowerCase().includes(query) ||
          false,
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((url) => url.status === statusFilter);
    }

    return filtered;
  }, [urls, searchQuery, statusFilter]);

  const statusLabel = (status: LinkStatus) => STATUS_LABELS[status];

  const handleCopy = useCallback(
    (shortUrl: string) => {
      const normalized = shortUrl.startsWith("http")
        ? shortUrl
        : `https://${shortUrl}`;
      navigator.clipboard.writeText(normalized);
      add({
        type: "success",
        title: "Success",
        description: `Link copied: ${normalized}`,
      });
    },
    [add],
  );

  const columns = useMemo<ColumnDef<DisplayUrl>[]>(
    () => [
      {
        accessorKey: "status",
        header: () => <span className="text-sm font-medium">Status</span>,
        cell: ({ row }) => {
          const status = row.original.status;
          const variant: "green" | "yellow" =
            status === "checking" ? "yellow" : "green";
          return (
            <Badge
              variant={variant}
              className={
                status === "healed"
                  ? "inline-flex items-center gap-1.5"
                  : undefined
              }
            >
              {status === "healed" && (
                <span className="bg-success h-1.5 w-1.5 rounded-full" />
              )}
              {STATUS_LABELS[status]}
            </Badge>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "shortUrl",
        header: () => <span className="text-sm font-medium">Short URL</span>,
        cell: ({ row }) => {
          const url = row.original;
          return <ShortUrlCell url={url} onCopy={handleCopy} />;
        },
        enableSorting: false,
      },
      {
        accessorKey: "clicks",
        header: ({ column }) => {
          return (
            <SortableHeader
              column={column}
              label="Clicks"
              ascTooltip="Sorted by clicks: least → most"
              descTooltip="Sorted by clicks: most → least"
              defaultTooltip="Sort by clicks"
            />
          );
        },
        cell: ({ row }) => {
          return (
            <div className="text-left">
              <p className="text-sm font-medium">{row.original.clicks}</p>
              <p className="text-muted-foreground text-xs">clicks</p>
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => {
          return (
            <SortableHeader
              column={column}
              label="Created"
              ascTooltip="Sorted by date: oldest first"
              descTooltip="Sorted by date: newest first"
              defaultTooltip="Sort by date"
            />
          );
        },
        cell: ({ row }) => {
          return (
            <p className="text-muted-foreground text-xs">
              {formatRelative(row.original.createdAt)}
            </p>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="text-sm font-medium">Options</span>,
        cell: ({ row }) => {
          const url = row.original;
          return (
            <button
              type="button"
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                const slug = url.shortUrl.split("/").pop() || "";
                navigate(`/link/${slug}`);
              }}
            >
              <MoreVertCircle className="size-4.5" />
            </button>
          );
        },
      },
    ],
    [navigate, handleCopy],
  );

  const table = useReactTable({
    data: filteredUrls,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 5,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const pageSize = table.getState().pagination.pageSize;

  return (
    <div className="border-border bg-card rounded-xl border">
      <div className="border-border border-b p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium">Recent Links</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Self-healing links with AI memory and conversations
            </p>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              showFilters || statusFilter !== "all"
                ? "bg-foreground text-background"
                : "border-border hover:bg-accent border"
            }`}
          >
            <FilterAlt className="size-4.5" />
            Filters
          </Button>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links by URL, content, or notes..."
            className="border-input bg-background focus:ring-foreground/20 w-full rounded-md border py-2.5 pr-10 pl-10 text-sm focus:ring-2 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <XmarkCircle className="size-4" />
            </button>
          )}
        </div>

        <div
          className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            showFilters ? "max-h-64" : "max-h-0"
          }`}
          aria-hidden={!showFilters}
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
                    onClick={() =>
                      setStatusFilter(status as LinkStatus | "all")
                    }
                    className={`rounded-md px-3 py-1 text-xs transition-colors ${
                      statusFilter === status
                        ? "bg-foreground text-background"
                        : "bg-background border-border hover:bg-accent border"
                    }`}
                  >
                    {status === "all"
                      ? "All"
                      : statusLabel(status as LinkStatus)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {(searchQuery || statusFilter !== "all") && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-xs">
              Active filters:
            </span>
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
        )}
      </div>

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
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search or filters"
                        : "Create your first shortened link to get started"}
                    </p>
                    {(searchQuery || statusFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setStatusFilter("all");
                        }}
                        className="bg-foreground text-background hover:bg-foreground/90 mt-4 rounded-md px-4 py-2 text-sm transition-colors"
                      >
                        Clear filters
                      </button>
                    )}
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
                      onClick={() =>
                        setExpandedId(isExpandedRow ? null : url.id)
                      }
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
                  {Array.from({ length: table.getPageCount() }).map(
                    (_, idx) => (
                      <SelectItem key={idx} value={String(idx + 1)}>
                        {idx + 1}
                      </SelectItem>
                    ),
                  )}
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
    </div>
  );
}

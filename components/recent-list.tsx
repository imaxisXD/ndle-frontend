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

import { Filter, MoreVerticalIcon, Search, X } from "./icons";
import { useNavigate } from "react-router";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
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

import { StatusBadge } from "./recent-list/StatusBadge";
import { ShortUrlCell } from "./recent-list/ShortUrlCell";
import { SortableHeader } from "./recent-list/SortableHeader";
import { ExpandedRowContent } from "./recent-list/ExpandedRowContent";
import {
  STATUS_LABELS,
  type LinkStatus,
  type DisplayUrl,
} from "./recent-list/types";

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const mockUrls: Array<DisplayUrl> = [
  {
    id: "mock-1",
    shortUrl: "ndle.im/a8x9k2",
    originalUrl: "https://example.com/blog/how-to-build-a-saas-product",
    clicks: 342,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    status: "healthy" as const,
    healingHistory: [
      {
        date: "1 week ago",
        action: "Detected slow response time",
      },
      {
        date: "1 week ago",
        action: "Cached via Wayback Machine as backup",
      },
    ],
    memory: {
      summary:
        "Analytics dashboard features including real-time metrics, custom reports, and data export capabilities.",
      notes: "Inspiration for our own dashboard redesign",
      savedReason: "UI/UX research",
    },
  },
];

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

  const urls = useQuery(api.urlMainFuction.getUserUrls);
  const isLoading = urls === undefined;
  const isEmpty = urls === null || (Array.isArray(urls) && urls.length === 0);

  const hydratedUrls = useMemo<Array<DisplayUrl>>(() => {
    if (!Array.isArray(urls) || urls.length === 0) {
      return [];
    }

    return urls.map((doc: Doc<"urls">, index: number) => {
      const fallback = mockUrls[index % mockUrls.length];
      const fallbackSlug = fallback.shortUrl.split("/").pop() ?? "pending";
      const slug = doc.slugAssigned ?? doc.shortUrl ?? fallbackSlug;
      const formattedShortUrl = slug.startsWith("http")
        ? slug
        : `ndle.im/${slug.replace(/^\/+/, "")}`;

      const message = (doc.urlStatusMessage ?? "").toLowerCase();
      const status: LinkStatus = message.includes("success")
        ? "healthy"
        : message.includes("heal")
        ? "healed"
        : message.includes("error") || message.includes("fail")
        ? "checking"
        : fallback.status;

      const clicks = fallback.clicks;

      return {
        id: doc._id,
        shortUrl: formattedShortUrl,
        originalUrl: doc.fullurl ?? fallback.originalUrl,
        clicks,
        createdAt: doc._creationTime ?? fallback.createdAt,
        status,
        analytics: fallback?.analytics,
      };
    });
  }, [urls]);

  const filteredUrls = useMemo(() => {
    let filtered: Array<DisplayUrl> = [...hydratedUrls];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (url) =>
          url.shortUrl.toLowerCase().includes(query) ||
          url.originalUrl.toLowerCase().includes(query) ||
          false
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((url) => url.status === statusFilter);
    }

    return filtered;
  }, [hydratedUrls, searchQuery, statusFilter]);

  const statusLabel = (status: LinkStatus) => STATUS_LABELS[status];

  const handleCopy = useCallback(
    (shortUrl: string) => {
      const normalized = shortUrl.startsWith("http")
        ? shortUrl
        : `https://${shortUrl}`;
      navigator.clipboard.writeText(normalized);
      add({
        type: "success",
        title: "Link copied to clipboard!",
        description: `Link copied to clipboard ${normalized}`,
      });
    },
    [add]
  );

  const columns = useMemo<ColumnDef<DisplayUrl>[]>(
    () => [
      {
        accessorKey: "status",
        header: () => (
          <span className="font-mono text-sm font-medium">Status</span>
        ),
        cell: ({ row }) => {
          const status = row.original.status;
          return <StatusBadge status={status} />;
        },
        enableSorting: false,
      },
      {
        accessorKey: "shortUrl",
        header: () => (
          <span className="font-mono text-sm font-medium">Short URL</span>
        ),
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
              <p className="font-mono text-sm font-medium">
                {row.original.clicks}
              </p>
              <p className="font-mono text-xs text-muted-foreground">clicks</p>
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
            <p className="font-mono text-xs text-muted-foreground">
              {formatRelative(row.original.createdAt)}
            </p>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const url = row.original;
          return (
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                const slug = url.shortUrl.split("/").pop() || "";
                navigate(`/link/${slug}`);
              }}
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </button>
          );
        },
      },
    ],
    [navigate, handleCopy]
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
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-mono text-lg font-medium">Recent Links</h2>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              Self-healing links with AI memory and conversations
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 font-mono text-sm transition-colors ${
              showFilters || statusFilter !== "all"
                ? "bg-foreground text-background"
                : "border border-border hover:bg-accent"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links by URL, content, or notes..."
            className="w-full rounded-md border border-input bg-background pl-10 pr-10 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div
          className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            showFilters ? "max-h-64" : "max-h-0"
          }`}
          aria-hidden={!showFilters}
        >
          <div className="mt-4 flex flex-wrap gap-3 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-medium text-muted-foreground">
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
                    className={`rounded-md px-3 py-1 font-mono text-xs transition-colors ${
                      statusFilter === status
                        ? "bg-foreground text-background"
                        : "bg-background border border-border hover:bg-accent"
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
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">
              Active filters:
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 font-mono text-xs">
                Search: {searchQuery}
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-1 font-mono text-xs">
                Status: {statusLabel(statusFilter as LinkStatus)}
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="font-mono text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="border-b border-border">
        {isLoading ? (
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-4 py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
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
                      <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : isEmpty || filteredUrls.length === 0 ? (
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="px-4 py-3">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <TableRow className="h-14">
                <TableCell colSpan={columns.length}>
                  <div className="p-12 text-center">
                    <Search className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 font-mono text-sm font-medium">
                      No links found
                    </h3>
                    <p className="mt-2 font-mono text-xs text-muted-foreground">
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
                        className="mt-4 rounded-md bg-foreground px-4 py-2 font-mono text-sm text-background transition-colors hover:bg-foreground/90"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {Array.from({ length: Math.max(0, pageSize - 1) }).map((_, i) => (
                <TableRow key={`pad-empty-${i}`} className="h-14">
                  {Array.from({ length: columns.length }).map((__, j) => (
                    <TableCell
                      key={`pad-e-${i}-${j}`}
                      className="px-4 py-3 opacity-0"
                    >
                      &nbsp;
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader className="sticky top-0 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="px-4 py-3">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
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
                      className="cursor-pointer h-14 odd:bg-background even:bg-muted/30"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="px-4 py-3">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
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
              <p className="font-mono text-sm">Links per page</p>
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
              <span className="font-mono text-sm">
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
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="rounded-md border border-border px-3 py-1.5 font-mono text-sm transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="rounded-md border border-border px-3 py-1.5 font-mono text-sm transition-colors hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
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

import React, { useCallback, useMemo, useState, Fragment } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { useNavigate } from "react-router";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FunctionReturnType } from "convex/server";
import {
  MoreVertCircle,
  Search,
  XmarkCircle,
  FilterAlt,
  Copy,
  OpenNewWindow,
  DataTransferDown,
  Brain,
  Clock,
  MessageText,
  PageEdit,
  Reports,
  ReportsSolid,
  ShieldPlusIn,
} from "iconoir-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "./ui/base-select";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/base-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { AiSummaryGenerator } from "./ai-summary-generator";
import { AiChat } from "./ai-chat";
import {
  type DisplayUrl,
  type LinkStatus,
  STATUS_LABELS,
} from "./url-table/types";

interface UrlTableProps {
  showSearch?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  defaultPageSize?: number;
  headerTitle?: string;
  headerDescription?: string;
  footerContent?: string;
  searchPlaceholder?: string;
  queryArgs?: Record<string, unknown>;
}

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function SortableHeader({
  column,
  label,
  ascTooltip,
  descTooltip,
  defaultTooltip,
}: {
  column: {
    getIsSorted: () => false | "asc" | "desc";
    getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
    id: string;
  };
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
            onClick={(e) => {
              const before = column.getIsSorted();
              console.log("[UrlTable] SortableHeader click", {
                columnId: column.id,
                before,
              });
              const handler = column.getToggleSortingHandler();
              if (handler) handler(e as unknown);
            }}
            className="hover:text-foreground flex cursor-pointer items-center gap-2 text-sm font-medium select-none"
          >
            <span>{label}</span>
            <span
              className={`inline-flex w-4 justify-center ${
                column.getIsSorted()
                  ? "text-accent"
                  : "text-muted-foreground/60"
              }`}
            >
              {column.getIsSorted() === "asc" ? (
                <span aria-hidden className="leading-none">
                  ↑
                </span>
              ) : column.getIsSorted() === "desc" ? (
                <span aria-hidden className="leading-none">
                  ↓
                </span>
              ) : (
                <DataTransferDown className="size-4" />
              )}
            </span>
          </button>
        }
      />
      <TooltipContent side="top">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

function ShortUrlCell({
  url,
  onCopy,
}: {
  url: DisplayUrl;
  onCopy: (shortUrl: string) => void;
}) {
  const normalizedHref = url.shortUrl.startsWith("http")
    ? url.shortUrl
    : `https://${url.shortUrl}`;
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-start gap-1">
        <a
          href={normalizedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group text-muted-foreground hover:bg-muted hover:text-foreground flex min-w-0 flex-1 items-center gap-1 rounded-md pr-1 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <code className="text-foreground truncate text-sm font-medium group-hover:underline group-hover:decoration-blue-500 group-hover:decoration-dashed group-hover:underline-offset-2">
            {url.shortUrl}
          </code>
          <OpenNewWindow
            className="size-3 flex-shrink-0 group-hover:text-blue-600"
            strokeWidth={2.4}
          />
        </a>
        <Button
          size="icon"
          variant="link"
          type="button"
          className="text-muted-foreground hover:bg-muted flex flex-shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(url.shortUrl);
          }}
        >
          <Copy className="size-4" strokeWidth={1.8} />
        </Button>
      </div>
      <p
        className="text-muted-foreground truncate text-xs"
        title={url.originalUrl}
      >
        {url.originalUrl}
      </p>
    </div>
  );
}

function ExpandedRowContent({
  columnsCount,
  url,
  activeTab,
  setActiveTab,
}: {
  columnsCount: number;
  url: DisplayUrl;
  activeTab: "memory" | "chat" | "healing" | "analytics";
  setActiveTab: (tab: "memory" | "chat" | "healing" | "analytics") => void;
}) {
  return (
    <TableRow>
      <TableCell colSpan={columnsCount} className="bg-muted/20 p-0">
        <div className="p-6">
          <div className="border-border mb-4 flex gap-2 border-b">
            <button
              type="button"
              onClick={() => setActiveTab("memory")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === "memory"
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <Brain className="h-4 w-4" />
              Memory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === "chat"
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <MessageText className="h-4 w-4" />
              Chat
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("healing")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === "healing"
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <ShieldPlusIn className="h-4 w-4" />
              Healing History
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm transition-colors ${
                activeTab === "analytics"
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
            >
              <Reports className="h-4 w-4" />
              Analytics
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === "memory" && (
              <div className="space-y-4">
                <AiSummaryGenerator url={url.originalUrl} />

                <div className="border-border bg-card rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <PageEdit className="text-muted-foreground h-4 w-4" />
                    <h4 className="text-sm font-medium">Your Notes</h4>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Add your notes here.
                  </p>
                </div>

                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-700" />
                    <h4 className="text-sm font-medium text-yellow-900">
                      Why You Saved This
                    </h4>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Keep a brief reason for future context.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "chat" && (
              <div className="space-y-4">
                <AiChat linkUrl={url.originalUrl} />
              </div>
            )}

            {activeTab === "healing" && (
              <div className="space-y-3">
                <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
                  <ShieldPlusIn className="mx-auto h-8 w-8 text-green-600" />
                  <p className="text-foreground mt-2 text-sm">
                    Link is healthy
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    No healing actions required
                  </p>
                </div>
              </div>
            )}

            {activeTab === "analytics" &&
              (url.analytics ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium">Clicks Over Time</h4>
                    <div className="mt-3 space-y-2">
                      {url.analytics.dailyClicks.map((d) => (
                        <div key={d.day} className="flex items-center gap-3">
                          <span className="w-8 text-xs">{d.day}</span>
                          <div className="flex-1">
                            <div className="bg-muted h-2 overflow-hidden rounded-md">
                              <div
                                className="bg-foreground h-full"
                                style={{
                                  width: `${
                                    (d.clicks /
                                      Math.max(
                                        ...url.analytics!.dailyClicks.map(
                                          (x) => x.clicks,
                                        ),
                                      )) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                          </div>
                          <span className="w-10 text-right text-xs">
                            {d.clicks}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium">Top Countries</h4>
                    <div className="mt-3 space-y-4">
                      {url.analytics.topCountries.map((c) => (
                        <div key={c.country}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs">{c.country}</span>
                            <span className="text-xs">{c.clicks}</span>
                          </div>
                          <div className="bg-muted h-2 overflow-hidden rounded-full">
                            <div
                              className="bg-foreground h-full"
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
                  <ReportsSolid className="text-muted-foreground/60 mx-auto h-8 w-8" />
                  <p className="text-foreground mt-2 text-sm font-medium">
                    No analytics yet
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Clicks and geography will appear here
                  </p>
                </div>
              ))}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function UrlTable({
  showSearch = false,
  showFilters = false,
  showPagination = false,
  showHeader = false,
  showFooter = false,
  defaultPageSize = 5,
  headerTitle = "",
  headerDescription = "",
  footerContent = "",
  searchPlaceholder = "Search links by URL, content, or notes...",
  queryArgs,
}: UrlTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "memory" | "chat" | "healing" | "analytics"
  >("memory");

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LinkStatus | "all">("all");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { add } = useToast();

  const urls = useQuery(
    api.urlMainFuction.getUserUrlsWithAnalytics,
    queryArgs ? (queryArgs as never) : undefined,
  );
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

    console.log("[UrlTable] filtered", {
      urlsCount: typedUrls.length,
      afterSearch: searchQuery ? filtered.length : undefined,
      afterStatus: statusFilter !== "all" ? filtered.length : undefined,
    });
    return filtered;
  }, [urls, searchQuery, statusFilter]);

  const sortedUrls = useMemo(() => {
    if (!Array.isArray(filteredUrls) || filteredUrls.length === 0) {
      return [] as Array<DisplayUrl>;
    }

    if (!sorting || sorting.length === 0) {
      return filteredUrls;
    }

    const [{ id, desc }] = sorting;
    const sorted = [...filteredUrls];

    if (id === "clicks" || id === "createdAt") {
      console.log("[UrlTable] sorting", {
        id,
        desc,
        count: sorted.length,
        first5: sorted.slice(0, 5).map((item) => ({
          createdAt: item.createdAt,
          clicks: item.clicks,
          id: item.id,
        })),
      });
      sorted.sort((a, b) => {
        const av = id === "clicks" ? a.clicks : a.createdAt;
        const bv = id === "clicks" ? b.clicks : b.createdAt;
        return av === bv ? 0 : av < bv ? -1 : 1;
      });
      if (desc) sorted.reverse();
      return sorted;
    }

    return filteredUrls;
  }, [filteredUrls, sorting]);

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

  const navigate = useNavigate();

  const columns = useMemo<ColumnDef<DisplayUrl>[]>(
    () => [
      {
        accessorKey: "status",
        header: () => <span className="pl-2 text-sm font-medium">Status</span>,
        cell: ({ row }) => {
          const status = row.original.status;
          const variant: "green" | "yellow" =
            status === "checking" ? "yellow" : "green";
          return (
            <div className="pl-2">
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
            </div>
          );
        },
        enableSorting: false,
        size: 100,
        maxSize: 100,
        minSize: 100,
      },
      {
        accessorKey: "shortUrl",
        header: () => <span className="text-sm font-medium">Short URL</span>,
        cell: ({ row }) => {
          const url = row.original;
          return <ShortUrlCell url={url} onCopy={handleCopy} />;
        },
        enableSorting: false,
        size: 200,
        maxSize: 200,
        minSize: 200,
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
        enableSorting: true,
        sortDescFirst: true,
        sortingFn: (rowA, rowB) => rowA.original.clicks - rowB.original.clicks,
        cell: ({ row }) => {
          return (
            <div className="text-left">
              <p className="text-sm font-medium">{row.original.clicks}</p>
              <p className="text-muted-foreground text-xs">clicks</p>
            </div>
          );
        },
        size: 80,
        maxSize: 80,
        minSize: 80,
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
        enableSorting: true,
        sortDescFirst: true,
        sortingFn: (rowA, rowB) =>
          rowA.original.createdAt - rowB.original.createdAt,
        cell: ({ row }) => {
          return (
            <p className="text-muted-foreground text-xs">
              {formatRelative(row.original.createdAt)}
            </p>
          );
        },
        size: 100,
        maxSize: 100,
        minSize: 100,
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
        size: 80,
        maxSize: 80,
        minSize: 80,
      },
    ],
    [handleCopy, navigate],
  );

  const table = useReactTable({
    data: sortedUrls,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualSorting: true,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    enableSortingRemoval: false,
    enableMultiSort: false,
    enableColumnResizing: false,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: defaultPageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const pageSize = table.getState().pagination.pageSize;
  const columns_count = table.getAllColumns().length;
  const currentRows = table.getRowModel().rows;

  try {
    // Debug current visible order
    console.log("[UrlTable] rows render", {
      pageIndex: table.getState().pagination.pageIndex,
      count: currentRows.length,
      first5CreatedAt: currentRows.slice(0, 5).map((r) => r.original.createdAt),
      sorting,
      sortedPreview: sortedUrls
        .slice(0, 5)
        .map((r) => ({ id: r.id, clicks: r.clicks, createdAt: r.createdAt })),
    });
  } catch {}

  return (
    <div className="border-border bg-card rounded-xl border">
      {/* Header Section */}
      {showHeader && (
        <div className="border-border border-b p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">{headerTitle}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {headerDescription}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Section */}
      {showSearch && (
        <div className="border-border border-b p-6">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
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
        </div>
      )}

      {/* Filters Section */}
      {showFilters && (
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
                        : STATUS_LABELS[status as LinkStatus]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters */}
          {!searchQuery && statusFilter === "all" ? null : (
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
                    Status: {STATUS_LABELS[statusFilter as LinkStatus]}
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
      )}

      {/* Table Section */}
      <div className="border-border border-b">
        {isLoading ? (
          <Table
            key={`${sorting.map((s) => `${s.id}:${s.desc}`).join("|")}`}
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <TableHeader className="bg-card sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-4 py-3"
                      style={{ width: header.getSize() }}
                    >
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
                  {Array.from({ length: columns_count }).map((__, j) => (
                    <TableCell key={`sk-${i}-${j}`} className="px-4 py-3">
                      <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : isEmpty || filteredUrls.length === 0 ? (
          <Table
            key={`${sorting.map((s) => `${s.id}:${s.desc}`).join("|") || "none"}`}
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <TableHeader className="bg-card sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-4 py-3"
                      style={{ width: header.getSize() }}
                    >
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
                <TableCell colSpan={columns_count} className="my-auto">
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
          <Table
            key={`${sorting.map((s) => `${s.id}:${s.desc}`).join("|") || "none"}`}
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <TableHeader className="bg-card sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="px-4 py-3"
                        style={{ width: header.getSize() }}
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className="flex items-center justify-start gap-2"
                            onClick={() => {
                              if (header.column.getCanSort()) {
                                const before = header.column.getIsSorted();
                                console.log("[UrlTable] header click", {
                                  columnId: header.column.id,
                                  before,
                                });
                              }
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                          </div>
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
                        <TableCell
                          key={cell.id}
                          className="px-4 py-3"
                          style={{ width: cell.column.getSize() }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>

                    {isExpandedRow && (
                      <ExpandedRowContent
                        columnsCount={columns_count}
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
                  {Array.from({ length: columns_count }).map((__, j) => (
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

      {/* Pagination Section */}
      {showPagination && (
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
                    {(() => {
                      const totalItems = filteredUrls.length;
                      const currentPageSize =
                        table.getState().pagination.pageSize;
                      const standardOptions = [5, 10, 20, 30, 50];

                      // Create dynamic options based on total items
                      const dynamicOptions = new Set<number>();

                      // Add standard options that are <= total items
                      standardOptions.forEach((option) => {
                        if (option <= totalItems) {
                          dynamicOptions.add(option);
                        }
                      });

                      // Add current page size if it's not in standard options
                      if (!dynamicOptions.has(currentPageSize)) {
                        dynamicOptions.add(currentPageSize);
                      }

                      // Add total items if it's not too large (max 100)
                      if (
                        totalItems <= 100 &&
                        !dynamicOptions.has(totalItems)
                      ) {
                        dynamicOptions.add(totalItems);
                      }

                      // Sort options
                      return Array.from(dynamicOptions).sort((a, b) => a - b);
                    })().map((pageSize) => (
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
                  onValueChange={(value) =>
                    table.setPageIndex(Number(value) - 1)
                  }
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
      )}

      {/* Footer Section */}
      {showFooter && (
        <div className="px-6 py-5">
          <div className="flex items-center justify-center">
            <p className="text-muted-foreground text-sm">{footerContent}</p>
          </div>
        </div>
      )}
    </div>
  );
}

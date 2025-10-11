import React, { useCallback, useMemo, useState, ReactNode } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
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
import { FunctionReturnType } from "convex/server";
import { MoreVertCircle } from "iconoir-react";
import { Badge } from "../ui/badge";
import { ShortUrlCell } from "./ShortUrlCell";
import { SortableHeader } from "./SortableHeader";
import { type DisplayUrl, type LinkStatus, STATUS_LABELS } from "./types";
import { UrlListContext, type UrlListContextType } from "./UrlListContext";
import { UrlListHeader } from "./UrlListHeader";
import { UrlListSearch } from "./UrlListSearch";
import { UrlListFilters } from "./UrlListFilters";
import { UrlListTable } from "./UrlListTable";
import { UrlListPagination } from "./UrlListPagination";
import { UrlListFooter } from "./UrlListFooter";

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface UrlListProps {
  children: ReactNode;
  defaultPageSize?: number;
  queryArgs?: Record<string, unknown>;
}

export function UrlList({
  children,
  defaultPageSize = 5,
  queryArgs,
}: UrlListProps) {
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

    return filtered;
  }, [urls, searchQuery, statusFilter]);

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
    [handleCopy, navigate],
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
        pageSize: defaultPageSize,
      },
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const contextValue: UrlListContextType = {
    urls,
    isLoading,
    isEmpty,
    filteredUrls,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    showFiltersPanel,
    setShowFiltersPanel,
    expandedId,
    setExpandedId,
    activeTab,
    setActiveTab,
    table,
    handleCopy,
  };

  return (
    <UrlListContext.Provider value={contextValue}>
      <div className="border-border bg-card rounded-xl border">{children}</div>
    </UrlListContext.Provider>
  );
}

UrlList.Header = UrlListHeader;
UrlList.Search = UrlListSearch;
UrlList.Filters = UrlListFilters;
UrlList.Table = UrlListTable;
UrlList.Pagination = UrlListPagination;
UrlList.Footer = UrlListFooter;

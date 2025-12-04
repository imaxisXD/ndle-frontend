import React, { useCallback, useMemo, useState, Fragment } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";
import { useTableSortingURL } from "../../hooks/use-table-sorting-url";
import { NavLink, useNavigate } from "react-router";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FunctionReturnType } from "convex/server";
import { Id } from "@/convex/_generated/dataModel";
import { useHotkeys } from "react-hotkeys-hook";
import {
  MoreVertCircle,
  Search,
  XmarkCircle,
  FilterAlt,
  OpenNewWindow,
  DataTransferDown,
  ArrowUp,
  ArrowDown,
  FilterSolid,
  KeyCommand,
} from "iconoir-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/base-select";
import { Tooltip, TooltipTrigger, TooltipContent } from "../ui/base-tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuShortcut,
  MenuTrigger,
} from "../ui/base-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogAction,
  DialogClose,
} from "../ui/base-dialog";
import { type DisplayUrl } from "./types";
import { formatRelative, cn } from "@/lib/utils";
import { CircleGridLoaderIcon } from "../icons";
import { Skeleton } from "../ui/skeleton";
import { makeShortLink } from "@/lib/config";
import NumberFlow from "@number-flow/react";
import { ChartLineIcon } from "lucide-react";
import { CopySimpleIcon, TrashIcon } from "@phosphor-icons/react";
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
  collectionId?: Id<"collections">;
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
    getToggleSortingHandler: () =>
      | ((event: React.MouseEvent) => void)
      | undefined;
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
              column.getIsSorted();
              const handler = column.getToggleSortingHandler();
              if (handler) handler(e);
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
                  <ArrowUp className="size-3" strokeWidth={2.5} />
                </span>
              ) : column.getIsSorted() === "desc" ? (
                <span aria-hidden className="leading-none">
                  <ArrowDown className="size-3" strokeWidth={2.5} />
                </span>
              ) : (
                <DataTransferDown className="size-4" strokeWidth={2} />
              )}
            </span>
          </button>
        }
      />
      <TooltipContent side="top">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

function ActionsMenuCell({
  url,
  onNavigateToAnalytics,
  onDeleteClick,
}: {
  url: DisplayUrl;
  onNavigateToAnalytics: (slug: string) => void;
  onDeleteClick: (slug: string, shortUrl: string) => void;
}) {
  const slug = url.shortUrl.split("/").pop() || "";
  const [menuOpen, setMenuOpen] = useState(false);

  useHotkeys(
    "meta+a",
    (e) => {
      if (menuOpen) {
        e.preventDefault();
        onNavigateToAnalytics(slug);
        setMenuOpen(false);
      }
    },
    { enabled: menuOpen, preventDefault: true },
  );

  useHotkeys(
    "meta+d",
    (e) => {
      if (menuOpen) {
        e.preventDefault();
        onDeleteClick(slug, url.shortUrl);
        setMenuOpen(false);
      }
    },
    { enabled: menuOpen, preventDefault: true },
  );

  return (
    <Menu open={menuOpen} onOpenChange={setMenuOpen}>
      <MenuTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MoreVertCircle className="size-4.5" />
          </button>
        }
      />
      <MenuContent sideOffset={4} className="w-48">
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToAnalytics(slug);
            setMenuOpen(false);
          }}
        >
          <ChartLineIcon />
          <span>Analytics</span>
          <MenuShortcut>
            <KeyCommand className="size-2.5 text-white" strokeWidth="2" /> A
          </MenuShortcut>
        </MenuItem>

        <MenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(slug, url.shortUrl);
            setMenuOpen(false);
          }}
        >
          <TrashIcon weight="duotone" />
          <span>Delete</span>
          <MenuShortcut>
            <KeyCommand className="size-2.5 text-white" strokeWidth="2" /> D
          </MenuShortcut>
        </MenuItem>
      </MenuContent>
    </Menu>
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
      <div className="flex items-center justify-start gap-0.5">
        <a
          href={normalizedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group text-muted-foreground hover:bg-muted hover:text-foreground flex min-w-0 items-center gap-1 rounded-md py-2 pr-3 pl-1 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <code className="text-foreground truncate text-sm font-medium group-hover:underline group-hover:decoration-blue-500 group-hover:decoration-dashed group-hover:underline-offset-2">
            {url.shortUrl}
          </code>
          <OpenNewWindow
            fontSize={8}
            className="shrink-0 group-hover:text-blue-600"
            strokeWidth={2.4}
          />
        </a>
        <Button
          size="icon"
          variant="link"
          type="button"
          className="text-muted-foreground hover:bg-muted flex shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(url.shortUrl);
          }}
        >
          <CopySimpleIcon />
        </Button>
      </div>
      <p
        className="text-muted-foreground truncate pl-1 text-xs"
        title={url.originalUrl}
      >
        {url.originalUrl}
      </p>
    </div>
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
  searchPlaceholder = "Search links by Link, content, or notes...",
  queryArgs,
  collectionId,
}: UrlTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [urlToDelete, setUrlToDelete] = useState<{
    slug: string;
    shortUrl: string;
  } | null>(null);

  const { sorting, updateSorting } = useTableSortingURL();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const { add } = useToast();
  const deleteUrl = useMutation(api.urlMainFuction.deleteUrl);

  const urls = useQuery(
    collectionId
      ? api.urlMainFuction.getUserUrlsWithAnalyticsByCollection
      : api.urlMainFuction.getUserUrlsWithAnalytics,
    collectionId
      ? ({ collectionId } as never)
      : queryArgs
        ? (queryArgs as never)
        : undefined,
  );
  type UserUrlsResponse = NonNullable<
    | FunctionReturnType<typeof api.urlMainFuction.getUserUrlsWithAnalytics>
    | FunctionReturnType<
        typeof api.urlMainFuction.getUserUrlsWithAnalyticsByCollection
      >
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
          : makeShortLink(slugSource.replace(/^\/+/, ""))
        : "";

      const message = (doc.analytics?.urlStatusMessage ?? "").toLowerCase();

      const status = message;

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

  const handleNavigateToAnalytics = useCallback(
    (slug: string) => {
      navigate(`/link/${slug}`);
    },
    [navigate],
  );

  const handleDeleteClick = useCallback((slug: string, shortUrl: string) => {
    setUrlToDelete({ slug, shortUrl });
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!urlToDelete) return;

    try {
      await deleteUrl({ urlSlug: urlToDelete.slug });
      setDeleteDialogOpen(false);
      setUrlToDelete(null);
      add({
        type: "success",
        title: "Link deleted",
        description: `The link has been deleted successfully`,
      });
    } catch (error) {
      add({
        type: "error",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete link",
      });
    }
  }, [urlToDelete, deleteUrl, add]);

  const columns = useMemo<ColumnDef<DisplayUrl>[]>(
    () => [
      {
        accessorKey: "status",
        header: () => <span className="pl-2 text-sm font-medium">Status</span>,
        cell: ({ row }) => {
          const status = row.original.status;
          const variant: "green" | "yellow" =
            status === "healthy" ? "green" : "yellow";
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
                {status}
              </Badge>
            </div>
          );
        },
        enableSorting: false,
        size: 60,
        maxSize: 60,
        minSize: 60,
      },
      {
        accessorKey: "shortUrl",
        header: () => <span className="text-sm font-medium">Short Link</span>,
        cell: ({ row }) => {
          const url = row.original;
          return <ShortUrlCell url={url} onCopy={handleCopy} />;
        },
        enableSorting: false,
        size: 180,
      },
      // Visual separator column
      {
        id: "separator",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        size: 60,
        maxSize: 60,
        minSize: 60,
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
            <div className="flex flex-col items-start justify-center">
              <p className="pl-5 text-sm font-medium">
                <NumberFlow value={row.original.clicks} isolate={true} />
              </p>
              <p className="text-muted-foreground text-xs">[clicks]</p>
            </div>
          );
        },
        size: 60,
        maxSize: 60,
        minSize: 60,
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
        size: 60,
        maxSize: 60,
        minSize: 60,
      },
      {
        id: "actions",
        header: () => <span className="text-sm font-medium">Options</span>,
        cell: ({ row }) => {
          const url = row.original;
          return (
            <ActionsMenuCell
              url={url}
              onNavigateToAnalytics={handleNavigateToAnalytics}
              onDeleteClick={handleDeleteClick}
            />
          );
        },
        size: 40,
      },
    ],
    [handleCopy, handleNavigateToAnalytics, handleDeleteClick],
  );

  const table = useReactTable({
    data: sortedUrls,
    columns,
    onSortingChange: updateSorting,
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

  const columns_count = table.getAllColumns().length;

  if (urls?.length === 0) {
    return null;
  }
  return (
    <div className="border-border bg-card rounded-md border">
      {showHeader && (
        <div className="border-border border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">{headerTitle}</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {headerDescription}
              </p>
            </div>
          </div>
        </div>
      )}

      {showSearch && (
        <div className="border-border border-b p-6">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="border-border bg-home focus:ring-foreground/20 w-full rounded-md border py-2.5 pr-10 pl-10 text-sm focus:ring-2 focus:outline-none"
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

      {showFilters && (
        <div className="border-border border-b p-6 py-3">
          <div className="flex items-center justify-end">
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
              {!showFiltersPanel ? (
                <FilterAlt className="size-4.5" />
              ) : (
                <FilterSolid className="size-4.5" />
              )}
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
                      onClick={() => setStatusFilter(status)}
                      className={`rounded-md px-3 py-1 text-xs transition-colors ${
                        statusFilter === status
                          ? "bg-foreground text-background"
                          : "bg-background border-border hover:bg-accent border"
                      }`}
                    >
                      {status === "all" ? "All" : status}
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
                  <Badge variant="primary">Status: {statusFilter}</Badge>
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

      <div className="border-border border-b">
        {isLoading ? (
          <Skeleton className="diagonal-dash bg-mute flex h-[499px] flex-col items-center justify-center rounded-none">
            <CircleGridLoaderIcon className="mx-auto size-6" />
            <h3 className="mt-4 text-sm font-medium">Loading</h3>
            <p className="text-muted-foreground mt-2 h-64 text-xs">
              Please wait while we load your links
            </p>
          </Skeleton>
        ) : isEmpty || filteredUrls.length === 0 ? (
          <Table
            key={`${sorting.map((s) => `${s.id}:${s.desc}`).join("|") || "none"}`}
            style={{ tableLayout: "fixed", width: "100%" }}
          >
            <TableHeader className="bg-card sticky top-0">
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
            <TableHeader className="bg-card sticky top-0">
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
                                header.column.getIsSorted();
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
                return (
                  <Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                      className="odd:bg-background even:bg-muted/30 h-14"
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
                  </Fragment>
                );
              })}
              {/* Removed padding rows to avoid rendering empty rows */}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination Section */}
      {showPagination && (
        <div className="px-6 py-5">
          {!isLoading && !isEmpty && filteredUrls.length > 0 ? (
            <div className="flex items-center justify-between gap-6">
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
            <NavLink
              to="/urls"
              className="text-sm text-blue-500 underline decoration-blue-500 decoration-dashed underline-offset-2 hover:text-blue-600"
            >
              [{footerContent}]
            </NavLink>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="gap-2">
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <TrashIcon weight="duotone" className="size-6" />
            Confirm Link Delete
          </DialogTitle>
          <DialogDescription className="text-primary mt-4 text-sm">
            Are you sure you want to delete this link and all its data? <br />
            <span className="text-muted-foreground text-xs">
              [Note : This action is permanent and cannot be undone]
            </span>
            {urlToDelete && (
              <div className="my-4">
                <p className="text-sm font-medium">Link to delete:</p>
                <p className="text-muted-foreground text-xs">
                  [{urlToDelete.shortUrl}]
                </p>
              </div>
            )}
          </DialogDescription>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              }
            />
            <DialogAction
              onClick={handleDeleteConfirm}
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center gap-2",
              )}
            >
              <TrashIcon weight="duotone" />
              <span>Delete Link</span>
            </DialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

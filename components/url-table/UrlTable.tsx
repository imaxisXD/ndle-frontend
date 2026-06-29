import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
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
import { Kbd } from "../ui/kbd";
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
import { formatRelative, cn, mapHealthStatusToUI } from "@/lib/utils";
import { DotmatrixLoaderIcon } from "@/components/ui/dotmatrix-loader-icon";
import { EmptyStateImage } from "@/components/empty-state-image";
import { AnimatedMetricNumber } from "@/components/animated-metric-number";
import { Skeleton } from "../ui/skeleton";
import { makeShortLinkWithDomain } from "@/lib/config";

import { ChartBarIcon, CopyIcon, TrashIcon } from "@phosphor-icons/react";
import { LinkWithFavicon } from "../ui/link-with-favicon";
import { trackUrlCopied, trackUrlDeleted } from "@/lib/posthog";
import type { HealthStatus } from "@/lib/utils";
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

type UserUrlsResponse = NonNullable<
  | FunctionReturnType<typeof api.urlMainFuction.getUserUrlsWithAnalytics>
  | FunctionReturnType<
      typeof api.urlMainFuction.getUserUrlsWithAnalyticsByCollection
    >
>;

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
  shortUrl,
  onNavigateToAnalytics,
  onDeleteClick,
}: {
  shortUrl: string;
  onNavigateToAnalytics: (slug: string) => void;
  onDeleteClick: (slug: string, shortUrl: string) => void;
}) {
  const slug = shortUrl.split("/").pop() || "";
  const [menuOpen, setMenuOpen] = useState(false);

  useHotkeys(
    ["a", "A"],
    (e) => {
      if (menuOpen) {
        e.preventDefault();
        e.stopPropagation();
        onNavigateToAnalytics(slug);
        setMenuOpen(false);
      }
    },
    { enabled: menuOpen, preventDefault: true, enableOnFormTags: false },
  );

  useHotkeys(
    "meta+d",
    (e) => {
      if (menuOpen) {
        e.preventDefault();
        onDeleteClick(slug, shortUrl);
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
      <MenuContent
        sideOffset={4}
        className="w-48"
        onKeyDown={(e) => {
          if ((e.key === "a" || e.key === "A") && menuOpen) {
            e.preventDefault();
            e.stopPropagation();
            onNavigateToAnalytics(slug);
            setMenuOpen(false);
          }
        }}
      >
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToAnalytics(slug);
            setMenuOpen(false);
          }}
        >
          <ChartBarIcon />
          <span>Analytics</span>
          <MenuShortcut>
            <Kbd>A</Kbd>
          </MenuShortcut>
        </MenuItem>

        <MenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(slug, shortUrl);
            setMenuOpen(false);
          }}
        >
          <TrashIcon weight="duotone" />
          <span>Delete</span>
          <MenuShortcut>
            <Kbd>
              <KeyCommand className="size-2.5 text-white" strokeWidth="2" />
            </Kbd>
            <Kbd>D</Kbd>
          </MenuShortcut>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function ShortUrlCell({
  shortUrl,
  originalUrl,
  onCopy,
}: {
  shortUrl: string;
  originalUrl: string;
  onCopy: (shortUrl: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const checkWrapRef = useRef<HTMLSpanElement>(null);
  const checkPathRef = useRef<SVGPathElement>(null);
  const revertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calibrate the stroke-draw to this exact check path once it's mounted.
  useEffect(() => {
    const path = checkPathRef.current;
    if (!path) return;
    const len = Math.ceil(path.getTotalLength());
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
  }, []);

  // Play the celebratory success-check appear the moment `copied` flips true.
  useEffect(() => {
    if (!copied) return;
    const node = checkWrapRef.current;
    if (!node) return;
    // Replay from an already-visible state: reset → reflow → run.
    node.setAttribute("data-state", "out");
    void node.offsetWidth; // force reflow so keyframes restart from offset 0
    node.setAttribute("data-state", "in");
  }, [copied]);

  // Clear the revert timer on unmount so it never fires against a stale node.
  useEffect(() => {
    return () => {
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
    };
  }, []);

  const normalizedHref = /^https?:\/\//i.test(shortUrl)
    ? shortUrl
    : `https://${shortUrl}`;
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-start gap-1">
        <LinkWithFavicon
          url={normalizedHref}
          originalUrl={originalUrl}
          onClick={(e) => e.stopPropagation()}
          iconClassName="size-3"
          asCode
        >
          {shortUrl}
        </LinkWithFavicon>

        <Button
          size="icon"
          variant="link"
          type="button"
          aria-label={copied ? "Copied" : "Copy short link"}
          className="text-muted-foreground hover:bg-muted flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(shortUrl);
            setCopied(true);
            if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
            revertTimerRef.current = setTimeout(() => setCopied(false), 2000);
          }}
        >
          {/* Icon slot: clipboard (a) cross-fades to the success check (b)
              the moment the link is copied. */}
          <span className="t-icon-swap" data-state={copied ? "b" : "a"}>
            <span className="t-icon" data-icon="a" aria-hidden="true">
              <CopyIcon
                className="size-3.5"
                weight="duotone"
                strokeWidth={2.5}
              />
            </span>
            <span className="t-icon" data-icon="b" aria-hidden="true">
              {/* success-check: plays the celebratory draw on copy */}
              <span
                ref={checkWrapRef}
                className="t-success-check size-3.5 text-green-600"
                data-state="out"
              >
                <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
                  <path
                    ref={checkPathRef}
                    d="M5 12.5 L10 17.5 L19 6.5"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
          </span>
        </Button>
      </div>
      <p
        className="text-muted-foreground truncate pl-1 text-xs"
        title={originalUrl}
      >
        {originalUrl}
      </p>
    </div>
  );
}

type StoredClickCount = {
  clicks: number;
  version: number;
};

const storedClickCounts = new Map<string, StoredClickCount>();
const clickCountListeners = new Map<string, Set<() => void>>();

function updateStoredClickCounts(
  clickCounts: Array<{ clicks: number; id: string }>,
) {
  for (const { clicks, id } of clickCounts) {
    const previous = storedClickCounts.get(id);

    if (!previous) {
      storedClickCounts.set(id, { clicks, version: 0 });
      continue;
    }

    if (previous.clicks === clicks) {
      continue;
    }

    storedClickCounts.set(id, {
      clicks,
      version: previous.version + 1,
    });

    const listeners = clickCountListeners.get(id);
    if (!listeners) {
      continue;
    }

    for (const tellCountChanged of listeners) {
      tellCountChanged();
    }
  }
}

function useStoredClickCount(clickCountId: string, startingClicks: number) {
  const startingSnapshot = useMemo<StoredClickCount>(
    () => ({ clicks: startingClicks, version: 0 }),
    [startingClicks],
  );

  const getSnapshot = useCallback(
    () => storedClickCounts.get(clickCountId) ?? startingSnapshot,
    [clickCountId, startingSnapshot],
  );

  const subscribe = useCallback(
    (tellCountChanged: () => void) => {
      const listeners = clickCountListeners.get(clickCountId) ?? new Set();
      listeners.add(tellCountChanged);
      clickCountListeners.set(clickCountId, listeners);

      return () => {
        listeners.delete(tellCountChanged);
        if (listeners.size === 0) {
          clickCountListeners.delete(clickCountId);
        }
      };
    },
    [clickCountId],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot).clicks;
}

function ClickCountNumber({
  clickCountId,
  startingClicks,
}: {
  clickCountId: string;
  startingClicks: number;
}) {
  const clicks = useStoredClickCount(clickCountId, startingClicks);

  return (
    <AnimatedMetricNumber
      animationKey={`url-clicks:${clickCountId}`}
      className="tabular-nums"
      value={clicks}
    />
  );
}

const urlTableColumnSize = {
  actions: 40,
  clicks: 60,
  createdAt: 60,
  separator: 60,
  shortUrl: 180,
  status: 60,
} as const;

type UrlDataRowProps = {
  createdAt: number;
  id: string;
  onCopy: (shortUrl: string) => void;
  onDeleteClick: (slug: string, shortUrl: string) => void;
  onNavigateToAnalytics: (slug: string) => void;
  originalUrl: string;
  shortUrl: string;
  startingClicks: number;
  status: string;
};

// React Compiler skips UrlTable because of useReactTable(), so rows need a real
// memo boundary here. Count changes go through ClickCountNumber instead.
const UrlDataRow = memo(function UrlDataRow({
  createdAt,
  id,
  onCopy,
  onDeleteClick,
  onNavigateToAnalytics,
  originalUrl,
  shortUrl,
  startingClicks,
  status,
}: UrlDataRowProps) {
  const variant = getStatusBadgeVariant(status);

  return (
    <TableRow className="bg-muted/30 h-14">
      <TableCell
        className="px-4 py-3"
        style={{ width: urlTableColumnSize.status }}
      >
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
      </TableCell>

      <TableCell
        className="px-4 py-3 align-top"
        style={{ width: urlTableColumnSize.shortUrl }}
      >
        <ShortUrlCell
          shortUrl={shortUrl}
          originalUrl={originalUrl}
          onCopy={onCopy}
        />
      </TableCell>

      <TableCell
        className="px-4 py-3 align-top"
        style={{ width: urlTableColumnSize.separator }}
      />

      <TableCell
        className="px-4 py-3 align-top"
        style={{ width: urlTableColumnSize.clicks }}
      >
        <div className="flex flex-col items-start space-y-1">
          <div className="flex h-8 items-center">
            <p className="pl-5 text-sm font-medium tabular-nums">
              <ClickCountNumber
                clickCountId={id}
                startingClicks={startingClicks}
              />
            </p>
          </div>
          <p className="text-muted-foreground text-xs">[clicks]</p>
        </div>
      </TableCell>

      <TableCell
        className="px-4 py-3 align-top"
        style={{ width: urlTableColumnSize.createdAt }}
      >
        <div className="flex h-8 items-center">
          <p className="text-muted-foreground translate-y-px text-xs">
            {formatRelative(createdAt)}
          </p>
        </div>
      </TableCell>

      <TableCell
        className="px-4 py-3 align-top"
        style={{ width: urlTableColumnSize.actions }}
      >
        <div className="flex h-8 items-center">
          <ActionsMenuCell
            shortUrl={shortUrl}
            onNavigateToAnalytics={onNavigateToAnalytics}
            onDeleteClick={onDeleteClick}
          />
        </div>
      </TableCell>
    </TableRow>
  );
}, areUrlDataRowPropsEqual);

function areUrlDataRowPropsEqual(
  previous: UrlDataRowProps,
  next: UrlDataRowProps,
) {
  return (
    previous.id === next.id &&
    previous.status === next.status &&
    previous.shortUrl === next.shortUrl &&
    previous.originalUrl === next.originalUrl &&
    previous.createdAt === next.createdAt &&
    previous.onCopy === next.onCopy &&
    previous.onDeleteClick === next.onDeleteClick &&
    previous.onNavigateToAnalytics === next.onNavigateToAnalytics
  );
}

type CollectionFilterOption = {
  collectionColor?: string | null;
  id: string;
  name: string;
};

const statusFilterOptions = [
  "all",
  "healthy",
  "warning",
  "error",
  "checking",
  "healed",
] as const;

// Search and filters do not use live click counts, so they should stay out of
// the count update render path.
const UrlTableSearch = memo(function UrlTableSearch({
  onClearSearch,
  onSearchChange,
  searchPlaceholder,
  searchQuery,
}: {
  onClearSearch: () => void;
  onSearchChange: (nextSearchQuery: string) => void;
  searchPlaceholder: string;
  searchQuery: string;
}) {
  return (
    <div className="border-border border-b p-6">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="border-border bg-home focus:ring-foreground/20 w-full rounded-md border py-2.5 pr-10 pl-10 text-sm focus:ring-2 focus:outline-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            <XmarkCircle className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
});

const UrlTableFilters = memo(function UrlTableFilters({
  collectionFilter,
  collectionOptions,
  onClearAllFilters,
  onClearSearch,
  onCollectionFilterChange,
  onStatusFilterChange,
  onToggleFiltersPanel,
  searchQuery,
  showFiltersPanel,
  statusFilter,
}: {
  collectionFilter: string | "all";
  collectionOptions: CollectionFilterOption[];
  onClearAllFilters: () => void;
  onClearSearch: () => void;
  onCollectionFilterChange: (collectionId: string | "all") => void;
  onStatusFilterChange: (status: string | "all") => void;
  onToggleFiltersPanel: () => void;
  searchQuery: string;
  showFiltersPanel: boolean;
  statusFilter: string | "all";
}) {
  const selectedCollection = collectionOptions.find(
    (collection) => collection.id === collectionFilter,
  );
  const hasActiveFilters =
    searchQuery || statusFilter !== "all" || collectionFilter !== "all";

  return (
    <div className="border-border border-b p-6 py-3">
      <div className="flex items-center justify-end">
        <Button
          variant="secondary"
          type="button"
          onClick={onToggleFiltersPanel}
          className={`hover:bg-accent hover:text-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
            showFiltersPanel ||
            statusFilter !== "all" ||
            collectionFilter !== "all"
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
        <div className="bg-muted/30 border-border mt-4 flex flex-col gap-4 rounded-lg border p-4">
          {collectionOptions.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground text-xs font-medium">
                Collection:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onCollectionFilterChange("all")}
                  className={`rounded-md px-3 py-1 text-xs transition-colors ${
                    collectionFilter === "all"
                      ? "bg-foreground text-background"
                      : "bg-background border-border hover:bg-accent border"
                  }`}
                >
                  All
                </button>
                {collectionOptions.map((collection) => (
                  <button
                    type="button"
                    key={collection.id}
                    onClick={() => onCollectionFilterChange(collection.id)}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
                      collectionFilter === collection.id
                        ? "bg-foreground text-background"
                        : "bg-background border-border hover:bg-accent border"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor:
                          collection.collectionColor || "#6b7280",
                      }}
                    />
                    {collection.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Status:
            </span>
            <div className="flex gap-2">
              {statusFilterOptions.map((status) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => onStatusFilterChange(status)}
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

      {!hasActiveFilters ? null : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Active filters:</span>
          {searchQuery && (
            <div className="inline-flex items-center">
              <Badge variant="primary">Search: {searchQuery}</Badge>
              <Button
                size="icon"
                variant="link"
                type="button"
                onClick={onClearSearch}
                className="p-1 hover:text-red-500"
              >
                <XmarkCircle className="size-4" />
              </Button>
            </div>
          )}
          {collectionFilter !== "all" && selectedCollection && (
            <div className="inline-flex items-center">
              <Badge variant="primary">
                <span
                  className="mr-1.5 h-2 w-2 rounded-full"
                  style={{
                    backgroundColor:
                      selectedCollection.collectionColor || "#6b7280",
                  }}
                />
                {selectedCollection.name || "Collection"}
              </Badge>
              <Button
                variant="link"
                type="button"
                size="icon"
                onClick={() => onCollectionFilterChange("all")}
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
                onClick={() => onStatusFilterChange("all")}
                className="p-1 hover:text-red-500"
              >
                <XmarkCircle className="size-4" />
              </Button>
            </div>
          )}
          <button
            type="button"
            onClick={onClearAllFilters}
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
});

function getDisplayStatus(doc: UserUrlsResponse[number]) {
  const healthStatus = doc.latestHealthCheck?.healthStatus as
    | HealthStatus
    | undefined;

  if (healthStatus) {
    return mapHealthStatusToUI(healthStatus);
  }

  const savedStatus = (
    doc.analytics?.urlStatusMessage ??
    doc.urlStatusMessage ??
    ""
  )
    .trim()
    .toLowerCase();

  switch (savedStatus) {
    case "success":
    case "healthy":
      return "healthy";
    case "failed":
    case "error":
      return "error";
    case "warning":
    case "degraded":
      return "warning";
    case "healed":
      return "healed";
    case "creating":
    case "checking":
    case "no traffic":
    case "":
      return "checking";
    default:
      return savedStatus;
  }
}

function getStatusBadgeVariant(status: string): "green" | "yellow" | "red" {
  if (status === "healthy" || status === "healed") {
    return "green";
  }

  if (status === "error") {
    return "red";
  }

  return "yellow";
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
  const [collectionFilter, setCollectionFilter] = useState<string | "all">(
    "all",
  );
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const handleSearchChange = useCallback((nextSearchQuery: string) => {
    setSearchQuery(nextSearchQuery);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleToggleFiltersPanel = useCallback(() => {
    setShowFiltersPanel((isPanelShown) => !isPanelShown);
  }, []);

  const handleCollectionFilterChange = useCallback(
    (nextCollectionFilter: string | "all") => {
      setCollectionFilter(nextCollectionFilter);
    },
    [],
  );

  const handleStatusFilterChange = useCallback(
    (nextStatusFilter: string | "all") => {
      setStatusFilter(nextStatusFilter);
    },
    [],
  );

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery("");
    setStatusFilter("all");
    setCollectionFilter("all");
  }, []);

  // Fetch collections for the filter
  const collections = useQuery(api.collectionMangament.getUserCollections, {});

  const collectionOptions = useMemo<CollectionFilterOption[]>(() => {
    if (!collections) {
      return [];
    }

    return collections.map((collection) => ({
      collectionColor: collection.collectionColor,
      id: collection.id,
      name: collection.name,
    }));
  }, [collections]);

  // Fetch the selected collection with URLs for filtering
  const selectedCollectionData = useQuery(
    api.collectionMangament.getCollectionById,
    collectionFilter !== "all" ? { collectionId: collectionFilter } : "skip",
  );
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
  const isLoading = urls === undefined;
  const hasLoadProblem = urls === null;
  const isEmpty = Array.isArray(urls) && urls.length === 0;

  // Destructure stable values from the query result to use in dependency arrays
  const selectedCollectionUrls = selectedCollectionData?.urls;

  const filteredUrls = useMemo(() => {
    if (!Array.isArray(urls) || urls.length === 0) {
      return [] as Array<DisplayUrl>;
    }

    const typedUrls = urls as UserUrlsResponse;
    const displayUrls = typedUrls.map((doc) => {
      const slugSource = doc.slugAssigned ?? doc.shortUrl;
      const formattedShortUrl = slugSource
        ? /^https?:\/\//i.test(slugSource)
          ? slugSource
          : makeShortLinkWithDomain(
              slugSource.replace(/^\/+/, ""),
              doc.customDomain,
            )
        : "";

      const status = getDisplayStatus(doc);

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

    // Filter by collection
    if (collectionFilter !== "all" && selectedCollectionUrls) {
      // Get URL IDs from the original urls data to match with collection.urls
      const urlIdMap = new Map<string, string>();
      (urls as UserUrlsResponse).forEach((doc) => {
        const slugSource = doc.slugAssigned ?? doc.shortUrl;
        const formattedShortUrl = slugSource
          ? /^https?:\/\//i.test(slugSource)
            ? slugSource
            : makeShortLinkWithDomain(
                slugSource.replace(/^\/+/, ""),
                doc.customDomain,
              )
          : "";
        urlIdMap.set(formattedShortUrl || doc.shortUrl, doc._id);
      });

      filtered = filtered.filter((url) => {
        const docId = urlIdMap.get(url.shortUrl);
        // Check if the URL's _id is in the collection's urls array
        return docId && selectedCollectionUrls.includes(docId as Id<"urls">);
      });
    }

    return filtered;
  }, [
    urls,
    searchQuery,
    statusFilter,
    collectionFilter,
    selectedCollectionUrls,
  ]);

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

  useLayoutEffect(() => {
    updateStoredClickCounts(
      sortedUrls.map((url) => ({ clicks: url.clicks, id: url.id })),
    );
  }, [sortedUrls]);

  const handleCopy = useCallback(
    (shortUrl: string) => {
      const normalized = /^https?:\/\//i.test(shortUrl)
        ? shortUrl
        : `https://${shortUrl}`;
      navigator.clipboard.writeText(normalized);
      trackUrlCopied();
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
      trackUrlDeleted();
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
          const variant = getStatusBadgeVariant(status);
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
        size: urlTableColumnSize.status,
        maxSize: urlTableColumnSize.status,
        minSize: urlTableColumnSize.status,
      },
      {
        accessorKey: "shortUrl",
        header: () => <span className="text-sm font-medium">Short Link</span>,
        cell: ({ row }) => {
          const url = row.original;
          return (
            <ShortUrlCell
              shortUrl={url.shortUrl}
              originalUrl={url.originalUrl}
              onCopy={handleCopy}
            />
          );
        },
        enableSorting: false,
        size: urlTableColumnSize.shortUrl,
      },
      // Visual separator column
      {
        id: "separator",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        size: urlTableColumnSize.separator,
        maxSize: urlTableColumnSize.separator,
        minSize: urlTableColumnSize.separator,
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
              <p className="pl-5 text-sm font-medium tabular-nums">
                <ClickCountNumber
                  clickCountId={row.original.id}
                  startingClicks={row.original.clicks}
                />
              </p>
              <p className="text-muted-foreground text-xs">[clicks]</p>
            </div>
          );
        },
        size: urlTableColumnSize.clicks,
        maxSize: urlTableColumnSize.clicks,
        minSize: urlTableColumnSize.clicks,
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
        size: urlTableColumnSize.createdAt,
        maxSize: urlTableColumnSize.createdAt,
        minSize: urlTableColumnSize.createdAt,
      },
      {
        id: "actions",
        header: () => <span className="text-sm font-medium">Options</span>,
        cell: ({ row }) => {
          const url = row.original;
          return (
            <ActionsMenuCell
              shortUrl={url.shortUrl}
              onNavigateToAnalytics={handleNavigateToAnalytics}
              onDeleteClick={handleDeleteClick}
            />
          );
        },
        size: urlTableColumnSize.actions,
      },
    ],
    [handleCopy, handleNavigateToAnalytics, handleDeleteClick],
  );

  const table = useReactTable({
    data: sortedUrls,
    columns,
    getRowId: (row) => row.id,
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
        <UrlTableSearch
          searchQuery={searchQuery}
          searchPlaceholder={searchPlaceholder}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
        />
      )}

      {showFilters && (
        <UrlTableFilters
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          collectionFilter={collectionFilter}
          collectionOptions={collectionOptions}
          showFiltersPanel={showFiltersPanel}
          onToggleFiltersPanel={handleToggleFiltersPanel}
          onCollectionFilterChange={handleCollectionFilterChange}
          onStatusFilterChange={handleStatusFilterChange}
          onClearSearch={handleClearSearch}
          onClearAllFilters={handleClearAllFilters}
        />
      )}

      <div className="border-border border-b">
        {isLoading ? (
          <Skeleton className="diagonal-dash bg-mute flex h-[499px] flex-col items-center justify-center rounded-none">
            <DotmatrixLoaderIcon className="mx-auto" size={24} />
            <h3 className="mt-4 text-sm font-medium">Loading</h3>
            <p className="text-muted-foreground mt-2 h-64 text-xs">
              Please wait while we load your links
            </p>
          </Skeleton>
        ) : hasLoadProblem || isEmpty || filteredUrls.length === 0 ? (
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
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
                  <div className="my-auto flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center">
                    <EmptyStateImage
                      alt=""
                      className={cn(
                        "mb-5 w-full",
                        hasLoadProblem ? "max-w-[560px]" : "max-w-[430px]",
                      )}
                      name={hasLoadProblem ? "errorLinks" : "noLinks"}
                    />
                    <h3 className="mt-4 text-sm font-medium">
                      {hasLoadProblem
                        ? "Links could not load"
                        : "No links found"}
                    </h3>
                    <p className="text-muted-foreground mt-2 max-w-sm text-xs">
                      {hasLoadProblem
                        ? "Try refreshing the page. Your saved links stay safe."
                        : "Create your first shortened link to get started"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
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
                const url = row.original;

                return (
                  <UrlDataRow
                    key={row.id}
                    id={url.id}
                    status={url.status}
                    shortUrl={url.shortUrl}
                    originalUrl={url.originalUrl}
                    startingClicks={url.clicks}
                    createdAt={url.createdAt}
                    onCopy={handleCopy}
                    onNavigateToAnalytics={handleNavigateToAnalytics}
                    onDeleteClick={handleDeleteClick}
                  />
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
              className="text-sm text-blue-500 hover:text-blue-600 hover:underline hover:decoration-blue-500 hover:decoration-dashed hover:underline-offset-4"
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
              <span className="my-4 block">
                <span className="block text-sm font-medium">
                  Link to delete:
                </span>
                <span className="text-muted-foreground block text-xs">
                  [{urlToDelete.shortUrl}]
                </span>
              </span>
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

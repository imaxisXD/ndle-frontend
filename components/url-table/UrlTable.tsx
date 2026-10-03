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
import { useMutation, usePaginatedQuery } from "convex/react";
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  tooltipVariants,
} from "../ui/base-tooltip";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
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
import { UrlTableFrame, UrlTableHeader } from "./UrlTableFrame";
import { UrlTableSkeletonRows } from "./UrlTableSkeletonRows";
import {
  formatRelative,
  formatRelativeTimeCompact,
  cn,
  getMonitoringStatus,
} from "@/lib/utils";
import { EmptyStateImage } from "@/components/empty-state-image";
import { AnimatedMetricNumber } from "@/components/animated-metric-number";
import { makeShortLinkWithDomain } from "@/lib/config";

import { ChartBarIcon, CopyIcon, TrashIcon } from "@phosphor-icons/react";
import { LinkWithFavicon } from "../ui/link-with-favicon";
import { trackUrlCopied, trackUrlDeleted } from "@/lib/posthog";
import { Inset } from "@/components/ui/inset";
import { Card } from "@/components/ui/card";
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

type UserUrlsResponse = FunctionReturnType<
  typeof api.urlLists.getUserUrlsPage
>["page"];

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
            className="hover:text-foreground -my-1.5 flex cursor-pointer items-center gap-2 py-1.5 text-sm font-medium select-none"
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
            className="text-muted-foreground hover:bg-surface-hover hover:text-foreground rounded-md p-2 transition-colors"
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

// The short link and its copy button. The original URL under it is its own
// grid cell, so the two can glide apart when the table narrows.
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
    <div className="flex min-w-0 items-center justify-start gap-1">
      <LinkWithFavicon
        url={normalizedHref}
        originalUrl={originalUrl}
        onClick={(e) => e.stopPropagation()}
        iconClassName="g-external size-3"
        asCode
      >
        {shortUrl}
      </LinkWithFavicon>

      <Button
        size="icon"
        variant="link"
        type="button"
        aria-label={copied ? "Copied" : "Copy short link"}
        className="text-muted-foreground hover:bg-surface-hover flex size-8 shrink-0 items-center justify-center rounded-md transition-colors hover:text-blue-600"
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
            <CopyIcon className="size-3.5" weight="duotone" strokeWidth={2.5} />
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

const statusDotColor = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  default: "bg-zinc-400",
} as const;

// Narrow rows have no room for the status badge, so status rides on the
// favicon's corner as a dot. It's a popover that also opens on hover rather
// than a tooltip: tooltips only open on hover and focus, so a phone could
// never reveal the status. This opens on hover with a mouse and on tap with a
// finger.
function StatusDot({ status }: { status: string }) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        openOnHover
        delay={0}
        aria-label={`Status: ${status}`}
        // The dot is 10px; the invisible ring around it makes a 22px target.
        className={cn(
          "g-status-dot ring-surface-inset relative size-2.5 cursor-default rounded-full ring-2 before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2",
          // Healed shares healthy's green, so it's a hollow ring to tell
          // the two apart at a glance. Its middle is the row's colour made
          // opaque (bg-surface-inset is a tint), so the favicon can't show
          // through.
          status === "healed"
            ? "border-2 border-green-500 bg-[color-mix(in_oklab,var(--surface-raised),oklch(0_0_0)_var(--surface-tint))]"
            : statusDotColor[getStatusBadgeVariant(status)],
        )}
        data-glide
        data-glide-pair="status"
      />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner side="top" sideOffset={8} className="z-50">
          <PopoverPrimitive.Popup
            className={cn(
              tooltipVariants({ variant: "default" }),
              "capitalize",
            )}
          >
            {status}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

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

  // Every piece marked data-glide moves to its new place when the table's
  // layout changes (the "Links table layouts" in app/globals.css).
  return (
    <div
      role="row"
      data-slot="url-table-row"
      data-glide-row
      className="glide-row bg-surface-inset border-border border-b last:border-b-0"
    >
      <div
        role="cell"
        className="g-status self-center"
        data-glide
        data-glide-pair="status"
      >
        <Badge
          variant={variant}
          className={
            status === "healed" ? "inline-flex items-center gap-1.5" : undefined
          }
        >
          {status === "healed" && (
            <span className="bg-success h-1.5 w-1.5 rounded-full" />
          )}
          {status}
        </Badge>
      </div>

      <div role="cell" className="g-link" data-glide>
        <ShortUrlCell
          shortUrl={shortUrl}
          originalUrl={originalUrl}
          onCopy={onCopy}
        />
      </div>

      <StatusDot status={status} />

      <p
        className="g-orig text-muted-foreground truncate pl-1 text-xs"
        title={originalUrl}
        data-glide
      >
        {originalUrl}
      </p>

      <div role="cell" className="g-clicks">
        <span
          className="flex h-8 items-center text-sm font-medium tabular-nums"
          data-glide
        >
          <ClickCountNumber clickCountId={id} startingClicks={startingClicks} />
        </span>
        <span className="text-muted-foreground text-xs" data-glide>
          [clicks]
        </span>
      </div>

      {/* Narrow rows show the short form; the two cross-fade as they glide. */}
      <div
        role="cell"
        className="g-created text-muted-foreground text-xs"
        data-glide
      >
        <span className="when-long">{formatRelative(createdAt)}</span>
        <span className="when-short" aria-hidden="true">
          {formatRelativeTimeCompact(createdAt)}
        </span>
      </div>

      <div role="cell" className="g-actions flex h-8 items-center" data-glide>
        <ActionsMenuCell
          shortUrl={shortUrl}
          onNavigateToAnalytics={onNavigateToAnalytics}
          onDeleteClick={onDeleteClick}
        />
      </div>
    </div>
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
  "pending",
  "unknown",
  "overdue",
  "disabled",
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
    <div className="border-border border-b p-4 sm:p-6">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="border-border bg-surface-field focus:ring-foreground/20 w-full rounded-md border py-2.5 pr-10 pl-10 text-base focus:ring-2 focus:outline-none sm:text-sm"
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
    <div className="border-border border-b px-4 py-3 sm:px-6">
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

      {/* Grid rows animate to the panel's real height, so nothing gets clipped
          however many collections there are. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          showFiltersPanel ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
        aria-hidden={!showFiltersPanel}
        inert={!showFiltersPanel}
      >
        <div className="min-h-0 overflow-hidden">
          <Inset className="mt-4 flex flex-col gap-4 rounded-lg p-4">
            {collectionOptions.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-muted-foreground text-xs font-medium">
                  Collection:
                </span>
                <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
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
                      className={`flex max-w-full items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
                        collectionFilter === collection.id
                          ? "bg-foreground text-background"
                          : "bg-background border-border hover:bg-accent border"
                      }`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            collection.collectionColor || "#6b7280",
                        }}
                      />
                      <span className="truncate">{collection.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="text-muted-foreground text-xs font-medium">
                Status:
              </span>
              <div className="flex flex-wrap gap-2">
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
          </Inset>
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

function getDisplayStatus(doc: UserUrlsResponse[number], now: number) {
  // Taken down by moderation: the short link no longer redirects.
  if (doc.disabledAt !== undefined) return "disabled";
  return getMonitoringStatus(
    doc.latestHealthCheck?.healthStatus ?? null,
    doc.latestHealthCheck?.checkedAt ?? null,
    now,
  );
}

function getStatusBadgeVariant(
  status: string,
): "green" | "yellow" | "red" | "default" {
  if (status === "healthy" || status === "healed") {
    return "green";
  }

  if (status === "error" || status === "disabled") {
    return "red";
  }

  return status === "warning" ? "yellow" : "default";
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
  searchPlaceholder = "Search links…",
  collectionId,
}: UrlTableProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
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
  const {
    results: collections,
    status: collectionPageStatus,
    loadMore: loadMoreCollections,
  } = usePaginatedQuery(
    api.collectionMangament.getCollectionsPage,
    showFilters && !collectionId ? {} : "skip",
    { initialNumItems: 50 },
  );

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

  const selectedCollectionId =
    collectionId ??
    (collectionFilter === "all"
      ? undefined
      : (collectionFilter as Id<"collections">));
  const selectedCollectionData = useQuery(
    api.collectionMangament.getCollectionById,
    selectedCollectionId ? { collectionId: selectedCollectionId } : "skip",
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

  const {
    results: urls,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(
    api.urlLists.getUserUrlsPage,
    selectedCollectionId ? { collectionId: selectedCollectionId } : {},
    { initialNumItems: 25 },
  );
  const collectionIsUpdating =
    !!selectedCollectionData && !selectedCollectionData.membersReady;
  const isLoading = pageStatus === "LoadingFirstPage";
  const hasLoadProblem =
    !!selectedCollectionId && selectedCollectionData === null;
  const isEmpty = !isLoading && urls.length === 0 && !collectionIsUpdating;
  const showLoadMoreLinks =
    showPagination &&
    (pageStatus === "CanLoadMore" || pageStatus === "LoadingMore");
  const showLoadMoreCollections =
    showFiltersPanel && !collectionId && collectionPageStatus !== "Exhausted";

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

      const status = getDisplayStatus(doc, now);

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
  }, [urls, searchQuery, statusFilter, now]);

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
        header: () => <span className="text-sm font-medium">Status</span>,
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
      },
      {
        id: "actions",
        // Narrow tables hide this heading visually (app/globals.css).
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

  const headings = Object.fromEntries(
    table
      .getHeaderGroups()[0]
      .headers.map((header) => [
        header.column.id,
        header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext()),
      ]),
  );
  const tableHeader = (
    <UrlTableHeader
      status={headings.status}
      shortUrl={headings.shortUrl}
      clicks={headings.clicks}
      createdAt={headings.createdAt}
      actions={headings.actions}
    />
  );

  return (
    <Card>
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

      <UrlTableFrame className="border-border border-b">
        {isLoading ? (
          <div role="table" aria-busy="true" aria-label="Loading your links">
            {tableHeader}
            <div role="rowgroup">
              <UrlTableSkeletonRows
                rows={table.getState().pagination.pageSize}
              />
            </div>
          </div>
        ) : collectionIsUpdating ? (
          <output className="block px-6 py-12 text-center">
            <span className="block text-sm font-medium">
              Updating collection
            </span>
            <span className="text-muted-foreground mt-2 block text-xs">
              Your saved links will appear here when the update finishes.
            </span>
          </output>
        ) : hasLoadProblem || isEmpty || filteredUrls.length === 0 ? (
          <div role="table" aria-label="Your links">
            {tableHeader}
            <div className="bg-surface-inset flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center">
              <EmptyStateImage
                alt=""
                className={cn(
                  "mb-5 w-full",
                  hasLoadProblem ? "max-w-[560px]" : "max-w-[430px]",
                )}
                name={hasLoadProblem ? "errorLinks" : "noLinks"}
              />
              <h3 className="mt-4 text-sm font-medium">
                {hasLoadProblem ? "Links could not load" : "No links found"}
              </h3>
              <p className="text-muted-foreground mt-2 max-w-sm text-xs">
                {hasLoadProblem
                  ? "Try refreshing the page. Your saved links stay safe."
                  : urls.length > 0
                    ? "No loaded links match these filters. Try another search or load more links."
                    : pageStatus !== "Exhausted"
                      ? "Load more links to continue."
                      : "Create your first shortened link to get started"}
              </p>
            </div>
          </div>
        ) : (
          <div role="table" aria-label="Your links">
            {tableHeader}
            <div role="rowgroup">
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
            </div>
          </div>
        )}
      </UrlTableFrame>

      {!isLoading && (showLoadMoreLinks || showLoadMoreCollections) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          {showLoadMoreLinks && (
            <Button
              variant="outline"
              onClick={() => loadMore(25)}
              disabled={pageStatus === "LoadingMore"}
            >
              {pageStatus === "LoadingMore" ? "Loading…" : "Load more links"}
            </Button>
          )}
          {showLoadMoreCollections && (
            <Button
              variant="ghost"
              onClick={() => loadMoreCollections(50)}
              disabled={collectionPageStatus !== "CanLoadMore"}
            >
              {collectionPageStatus === "CanLoadMore"
                ? "Load more collections"
                : "Loading collections…"}
            </Button>
          )}
        </div>
      )}

      {/* Pagination Section */}
      {showPagination && (
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          {!isLoading && !isEmpty && filteredUrls.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <p className="text-sm whitespace-nowrap">
                  <span className="sm:hidden">Per page</span>
                  <span className="hidden sm:inline">Links per page</span>
                </p>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger aria-label="Links per page" className="px-3">
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
                <span className="text-sm whitespace-nowrap">
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
                  className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="border-border hover:bg-accent rounded-md border px-3 py-1.5 text-sm whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
    </Card>
  );
}

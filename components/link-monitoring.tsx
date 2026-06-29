"use client";

import { memo, useMemo, useState } from "react";
import {
  type Column,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useQuery } from "convex-helpers/react/cache/hooks";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Badge } from "@ui/badge";
import { Card, CardContent } from "@ui/card";
import { RecentIncidents } from "./recent-incidents";
import { Skeleton } from "./ui/skeleton";
import { getShortDomain } from "@/lib/config";
import {
  cn,
  formatRelativeTimeCompact,
  getResponseTimeColor,
  mapHealthStatusToUI,
} from "@/lib/utils";
import { LinkWithFavicon } from "./ui/link-with-favicon";
import { EmptyStateImage } from "@/components/empty-state-image";
import { AnimatedMetricNumber } from "@/components/animated-metric-number";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

const shortDomain = getShortDomain();

type HealthChecksWithStats = FunctionReturnType<
  typeof api.linkHealth.getHealthChecksWithStats
>;
type RecentIncidentsResponse = FunctionReturnType<
  typeof api.linkHealth.getRecentIncidents
>;
type MonitoringStatus = ReturnType<typeof mapHealthStatusToUI>;

type MonitoringTableRow = {
  checkedAt: number;
  checkedLabel: string;
  id: string;
  incidents: number;
  latencyMs: number;
  originalUrl: string;
  shortUrl: string;
  status: MonitoringStatus;
  uptime: number;
};

type OverviewStat = {
  color: string;
  formatValue?: (value: number) => string;
  id: string;
  label: string;
  value: number;
};

const monitoringColumnSize = {
  checked: 120,
  incidents: 120,
  latency: 120,
  link: 360,
  status: 120,
  uptime: 120,
} as const;

const statusRank: Record<MonitoringStatus, number> = {
  error: 0,
  warning: 1,
  healthy: 2,
};

const uptimeFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

function formatUptimeMetric(value: number) {
  return `${uptimeFormatter.format(value)}%`;
}

function formatLatencyMetric(value: number) {
  return `${Math.round(value)}ms`;
}

function getStatusBadgeVariant(status: MonitoringStatus) {
  if (status === "healthy") return "green";
  if (status === "warning") return "yellow";
  return "red";
}

function MonitoringSortHeader({
  column,
  label,
}: {
  column: Column<MonitoringTableRow, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  const sortLabel =
    sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none";

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className="hover:text-foreground text-muted-foreground flex items-center gap-1 text-left text-xs font-medium tracking-wider uppercase"
      aria-label={`${label}, sorted ${sortLabel}`}
    >
      <span>{label}</span>
      <span className="inline-flex w-3 justify-center text-[10px]">
        {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : ""}
      </span>
    </button>
  );
}

const monitoringColumns: ColumnDef<MonitoringTableRow>[] = [
  {
    accessorKey: "status",
    header: ({ column }) => (
      <MonitoringSortHeader column={column} label="Status" />
    ),
    sortingFn: (rowA, rowB) =>
      statusRank[rowA.original.status] - statusRank[rowB.original.status],
    size: monitoringColumnSize.status,
    minSize: monitoringColumnSize.status,
    maxSize: monitoringColumnSize.status,
  },
  {
    accessorKey: "shortUrl",
    header: ({ column }) => (
      <MonitoringSortHeader column={column} label="Link" />
    ),
    size: monitoringColumnSize.link,
  },
  {
    accessorKey: "uptime",
    header: ({ column }) => (
      <MonitoringSortHeader column={column} label="Uptime" />
    ),
    size: monitoringColumnSize.uptime,
    minSize: monitoringColumnSize.uptime,
    maxSize: monitoringColumnSize.uptime,
  },
  {
    accessorKey: "latencyMs",
    header: ({ column }) => (
      <MonitoringSortHeader column={column} label="Latency" />
    ),
    size: monitoringColumnSize.latency,
    minSize: monitoringColumnSize.latency,
    maxSize: monitoringColumnSize.latency,
  },
  {
    accessorKey: "incidents",
    header: ({ column }) => (
      <MonitoringSortHeader column={column} label="Incidents" />
    ),
    size: monitoringColumnSize.incidents,
    minSize: monitoringColumnSize.incidents,
    maxSize: monitoringColumnSize.incidents,
  },
  {
    accessorKey: "checkedAt",
    header: ({ column }) => (
      <MonitoringSortHeader column={column} label="Checked" />
    ),
    size: monitoringColumnSize.checked,
    minSize: monitoringColumnSize.checked,
    maxSize: monitoringColumnSize.checked,
  },
];

function getMonitoringRows(healthData: HealthChecksWithStats | undefined) {
  return (healthData ?? []).map((check) => ({
    checkedAt: check.checkedAt,
    checkedLabel: formatRelativeTimeCompact(check.checkedAt),
    id: check._id,
    incidents: check.incidents,
    latencyMs: check.latencyMs,
    originalUrl: check.longUrl,
    shortUrl: `https://${shortDomain}/${check.shortUrl}`,
    status: mapHealthStatusToUI(check.healthStatus),
    uptime: check.uptime,
  }));
}

function getOverviewStats(links: MonitoringTableRow[]): OverviewStat[] {
  const healthyCount = links.filter((link) => link.status === "healthy").length;
  const warningCount = links.filter((link) => link.status === "warning").length;
  const errorCount = links.filter((link) => link.status === "error").length;
  const avgUptime =
    links.length > 0
      ? (
          links.reduce((sum, link) => sum + link.uptime, 0) / links.length
        ).toFixed(1)
      : "100.0";

  return [
    {
      id: "healthy-links",
      label: "Healthy Links",
      value: healthyCount,
      color: "text-green-600",
    },
    {
      id: "warnings",
      label: "Warnings",
      value: warningCount,
      color: "text-amber-500",
    },
    {
      id: "errors",
      label: "Errors",
      value: errorCount,
      color: "text-red-500",
    },
    {
      formatValue: formatUptimeMetric,
      id: "average-uptime",
      label: "Avg Uptime",
      value: Number(avgUptime),
      color: "text-blue-500",
    },
  ];
}

function getIncidentRows(recentIncidents: RecentIncidentsResponse | undefined) {
  return (recentIncidents ?? []).map((incident) => ({
    id: incident._id,
    link: incident.shortUrl,
    type: incident.type,
    message: incident.message,
    time: formatRelativeTimeCompact(incident.createdAt),
  }));
}

function MetricCell({
  animationKey,
  formatValue,
  label,
  minWidthCh,
  value,
  valueClassName,
}: {
  animationKey: string;
  formatValue?: (value: number) => string;
  label: string;
  minWidthCh?: number;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="w-24 shrink-0 space-y-1">
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
        {label}
      </p>
      <p className={cn("font-mono text-xs tabular-nums", valueClassName)}>
        <AnimatedMetricNumber
          animationKey={animationKey}
          formatValue={formatValue}
          minWidthCh={minWidthCh}
          value={value}
        />
      </p>
    </div>
  );
}

function TextMetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-24 shrink-0 space-y-1">
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
        {label}
      </p>
      <p className="text-xs">{value}</p>
    </div>
  );
}

type MonitoringDataRowProps = MonitoringTableRow;

const MonitoringDataRow = memo(function MonitoringDataRow({
  checkedLabel,
  id,
  incidents,
  latencyMs,
  originalUrl,
  shortUrl,
  status,
  uptime,
}: MonitoringDataRowProps) {
  return (
    <TableRow className="group bg-card hover:bg-muted/30">
      <TableCell
        className="px-5 py-5"
        style={{ width: monitoringColumnSize.status }}
      >
        <div className="w-20">
          <Badge variant={getStatusBadgeVariant(status)} className="capitalize">
            {status}
          </Badge>
        </div>
      </TableCell>

      <TableCell
        className="px-5 py-5"
        style={{ width: monitoringColumnSize.link }}
      >
        <div className="flex min-w-0 flex-col space-y-1">
          <LinkWithFavicon url={shortUrl} originalUrl={originalUrl} />
          <p
            className="text-muted-foreground max-w-[280px] truncate text-xs"
            title={originalUrl}
          >
            {originalUrl}
          </p>
        </div>
      </TableCell>

      <TableCell
        className="px-5 py-5"
        style={{ width: monitoringColumnSize.uptime }}
      >
        <MetricCell
          animationKey={`monitoring:${id}:uptime`}
          formatValue={formatUptimeMetric}
          label="Uptime"
          minWidthCh={5}
          value={uptime}
        />
      </TableCell>

      <TableCell
        className="px-5 py-5"
        style={{ width: monitoringColumnSize.latency }}
      >
        {latencyMs > 0 ? (
          <MetricCell
            animationKey={`monitoring:${id}:latency`}
            formatValue={formatLatencyMetric}
            label="Latency"
            minWidthCh={5}
            value={latencyMs}
            valueClassName={getResponseTimeColor(latencyMs)}
          />
        ) : (
          <TextMetricCell label="Latency" value="N/A" />
        )}
      </TableCell>

      <TableCell
        className="px-5 py-5"
        style={{ width: monitoringColumnSize.incidents }}
      >
        <MetricCell
          animationKey={`monitoring:${id}:incidents`}
          label="Incidents"
          value={incidents}
        />
      </TableCell>

      <TableCell
        className="px-5 py-5"
        style={{ width: monitoringColumnSize.checked }}
      >
        <TextMetricCell label="Checked" value={checkedLabel} />
      </TableCell>
    </TableRow>
  );
}, areMonitoringDataRowPropsEqual);

function areMonitoringDataRowPropsEqual(
  previous: MonitoringDataRowProps,
  next: MonitoringDataRowProps,
) {
  return (
    previous.id === next.id &&
    previous.status === next.status &&
    previous.shortUrl === next.shortUrl &&
    previous.originalUrl === next.originalUrl &&
    previous.uptime === next.uptime &&
    previous.latencyMs === next.latencyMs &&
    previous.incidents === next.incidents &&
    previous.checkedAt === next.checkedAt &&
    previous.checkedLabel === next.checkedLabel
  );
}

// TanStack returns row objects that can change as the table recalculates, so
// the memoized row receives only plain values from row.original.
const MonitoredLinksTable = memo(function MonitoredLinksTable({
  links,
}: {
  links: MonitoringTableRow[];
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data: links,
    columns: monitoringColumns,
    getRowId: (row) => row.id,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: true,
    enableMultiSort: false,
  });

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-12 text-center">
        <EmptyStateImage
          alt=""
          className="mb-5 w-full max-w-[460px]"
          name="noMonitoring"
        />
        <h3 className="mt-4 text-lg font-medium">No monitored links yet</h3>
        <p className="text-muted-foreground max-w-sm text-sm">
          Create a shortened link and health monitoring will start
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-md border">
      <Table style={{ tableLayout: "fixed", width: "100%" }}>
        <TableHeader className="bg-card">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="px-5 py-3"
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
          {table.getRowModel().rows.map((row) => (
            <MonitoringDataRow key={row.id} {...row.original} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

const MonitoringStats = memo(function MonitoringStats({
  stats,
}: {
  stats: OverviewStat[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="rounded-sm bg-white">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {stat.label}
              </p>
              <p className={cn("text-xl tabular-nums", stat.color)}>
                [
                {/* minWidthCh=0 so the value shrink-wraps and the brackets
                    hug the number ([0] not [0 ]). These cards each own their
                    column, so no inter-card width-stability is needed. */}
                <AnimatedMetricNumber
                  animationKey={`monitoring-stat:${stat.id}`}
                  formatValue={stat.formatValue}
                  minWidthCh={0}
                  value={stat.value}
                />
                ]
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

function MonitoringSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-24 w-full" />
        ))}
      </div>

      <div className="border-border bg-card overflow-hidden rounded-md border">
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader className="bg-card">
            <TableRow className="hover:bg-transparent">
              {[
                "Status",
                "Link",
                "Uptime",
                "Latency",
                "Incidents",
                "Checked",
              ].map((label) => (
                <TableHead key={label} className="px-5 py-3">
                  <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    {label}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((row) => (
              <TableRow key={row} className="bg-card">
                <TableCell className="px-5 py-5">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </TableCell>
                <TableCell className="px-5 py-5">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </TableCell>
                {[1, 2, 3, 4].map((cell) => (
                  <TableCell key={cell} className="px-5 py-5">
                    <div className="space-y-2">
                      <Skeleton className="h-2 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="border-border rounded-xl border bg-white p-6">
        <div className="mb-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-3 w-56" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="border-border flex items-start gap-4 rounded-lg border bg-white p-4"
            >
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
          ))}
        </div>
      </div>
    </div>
  );
}

export function LinkMonitoring() {
  const healthData = useQuery(api.linkHealth.getHealthChecksWithStats);
  const recentIncidents = useQuery(api.linkHealth.getRecentIncidents, {
    limit: 10,
  });

  const links = useMemo(() => getMonitoringRows(healthData), [healthData]);
  const stats = useMemo(() => getOverviewStats(links), [links]);
  const incidents = useMemo(
    () => getIncidentRows(recentIncidents),
    [recentIncidents],
  );

  if (healthData === undefined) {
    return <MonitoringSkeleton />;
  }

  return (
    <div className="relative min-h-screen space-y-8 pb-10">
      <MonitoringStats stats={stats} />

      <MonitoredLinksTable links={links} />

      <div className="pt-4">
        <RecentIncidents incidents={incidents} />
      </div>
    </div>
  );
}

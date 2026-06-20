"use client";

/**
 * Chart Component Registry
 *
 * Maps JSON Render catalog component types to chart components styled with
 * the same primitives used by the native analytics charts.
 */

import type {
  ComponentRegistry,
  ComponentRenderProps,
} from "@json-render/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useChartQueryContext } from "@/hooks/chart-query-context";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChartBarIcon,
  ChartLineIcon,
  ChartPieIcon,
  StackIcon,
} from "@phosphor-icons/react";
import {
  BklitAreaSeriesChart,
  BklitDonutChart,
  BklitHorizontalBarChart,
  BklitLineSeriesChart,
  BklitVerticalBarChart,
} from "@/components/charts/bklit-chart-kit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CHART_COLORS = [
  "#ffc700",
  "#06b6d4",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
];

const CARD_CLASS =
  "min-w-0 flex h-full flex-col border-zinc-200 bg-white text-zinc-900";
const CONTENT_HEIGHT = "clamp(220px, 35vh, 280px)";
const PIE_CONTENT_HEIGHT = "clamp(220px, 32vh, 260px)";
const AI_TIME_KEY = "__bklitTime";

function isNumericLike(value: unknown): boolean {
  if (typeof value === "number" || typeof value === "bigint") return true;
  if (typeof value !== "string") return false;
  if (value.trim() === "") return false;
  return Number.isFinite(Number(value));
}

function formatTickLabel(value: unknown, maxLength = 12): string {
  const raw = String(value ?? "");
  const normalized = /^\d{4}-\d{2}-\d{2}T/.test(raw) ? raw.slice(0, 10) : raw;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(1, maxLength - 1))}…`;
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? new Intl.NumberFormat("en-US").format(value)
      : String(value);
  }
  if (typeof value === "bigint") {
    return new Intl.NumberFormat("en-US").format(Number(value));
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }
  return String(value);
}

function normalizeColumnName(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!value || typeof value !== "object") return null;

  const candidateKeys = [
    "key",
    "name",
    "label",
    "field",
    "id",
    "accessor",
    "dataKey",
    "value",
  ] as const;

  for (const candidate of candidateKeys) {
    const maybe = (value as Record<string, unknown>)[candidate];
    if (typeof maybe === "string" && maybe.trim().length > 0) {
      return maybe.trim();
    }
  }

  return null;
}

function resolveRowValue(
  row: Record<string, unknown>,
  column: string,
): unknown {
  if (column in row) {
    return row[column];
  }

  const lower = column.toLowerCase();
  const match = Object.keys(row).find((key) => key.toLowerCase() === lower);
  if (match) {
    return row[match];
  }

  return undefined;
}

function getFriendlyError(error: string): string {
  if (/Binder Error|Referenced column|not found in FROM clause/i.test(error)) {
    return "Could not match one or more requested fields for this chart.";
  }
  if (/Parser Error|syntax error/i.test(error)) {
    return "The generated query could not be parsed.";
  }
  if (/Authentication required/i.test(error)) {
    return "Authentication is required to query chart data.";
  }
  return "Unable to render this chart right now.";
}

function getMetricValueFromRows(rows: Array<Record<string, unknown>>): number {
  const first = rows[0];
  if (!first) return 0;

  if (isNumericLike(first.value)) {
    return Number(first.value);
  }

  for (const value of Object.values(first)) {
    if (isNumericLike(value)) {
      return Number(value);
    }
  }

  return 0;
}

function coerceChartDate(value: unknown, index: number): Date {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const epochMs = value < 10_000_000_000 ? value * 1000 : value;
    const parsed = new Date(epochMs);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = new Date(value);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date(Date.UTC(2026, 0, index + 1));
}

function coerceTimeSeriesRows(
  data: Array<Record<string, unknown>>,
  dateKey: string,
  valueKey: string,
): Array<Record<string, unknown>> {
  return data.map((row, index) => ({
    ...row,
    [valueKey]: isNumericLike(row[valueKey]) ? Number(row[valueKey]) : row[valueKey],
    [AI_TIME_KEY]: coerceChartDate(row[dateKey], index),
  }));
}

function useChartData(query?: string) {
  const {
    execute,
    isLoading: isQueryLoading,
    isReady,
  } = useChartQueryContext();
  const [data, setData] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || !isReady) {
      return;
    }

    let isCancelled = false;
    setError(null);

    execute(query)
      .then((rows) => {
        if (!isCancelled) {
          setData(rows);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message =
            err instanceof Error ? err.message : "Failed to load chart data";
          setError(message);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [execute, isReady, query]);

  return {
    data,
    error,
    isLoading: isQueryLoading || !isReady,
  };
}

function ChartCardShell({
  title,
  description,
  icon,
  isLoading,
  error,
  isEmpty,
  emptyMessage,
  children,
}: {
  title?: string;
  description?: string;
  icon?: ReactNode;
  isLoading: boolean;
  error?: string | null;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="border-b border-zinc-200 px-4 py-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 font-medium text-zinc-900">
          {icon}
          {title || "Chart"}
        </CardTitle>
        {description ? (
          <CardDescription className="text-xs text-zinc-400">
            {description}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grow p-4 sm:p-6">
        {error ? (
          <div className="h-[200px] rounded-sm border border-red-100 bg-red-50 p-4 text-sm text-red-600">
            <p className="font-medium">{getFriendlyError(error)}</p>
            <p className="mt-2 line-clamp-4 text-xs text-red-500">{error}</p>
          </div>
        ) : isLoading ? (
          <div
            className="flex flex-col justify-between"
            style={{ height: CONTENT_HEIGHT }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded" />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function BarChartComponent({ element }: ComponentRenderProps) {
  const { title, description, xKey, yKey, orientation, color } =
    element.props as {
      title?: string;
      description?: string;
      xKey?: string;
      yKey?: string;
      orientation?: "horizontal" | "vertical";
      color?: string;
    };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const valueKey = yKey || "value";
  const categoryKey = xKey || "category";
  const barColor = color || "#ffc700";
  const isHorizontal = orientation === "horizontal";

  return (
    <ChartCardShell
      title={title}
      description={description}
      icon={<ChartBarIcon className="size-5" weight="duotone" />}
      isLoading={isLoading}
      error={error}
      isEmpty={data.length === 0}
      emptyMessage="No data available"
    >
      {isHorizontal ? (
        <BklitHorizontalBarChart
          color={barColor}
          data={data}
          heightClassName="h-auto"
          labelFormatter={(value) => formatTickLabel(value, 18)}
          labelKey={categoryKey}
          labelWidth={112}
          showValueLabels={false}
          style={{ height: CONTENT_HEIGHT }}
          valueKey={valueKey}
        />
      ) : (
        <BklitVerticalBarChart
          color={barColor}
          data={data}
          heightClassName="h-auto"
          labelFormatter={(value) => formatTickLabel(value, 18)}
          labelKey={categoryKey}
          style={{ height: CONTENT_HEIGHT }}
          valueKey={valueKey}
        />
      )}
    </ChartCardShell>
  );
}

function LineChartComponent({ element }: ComponentRenderProps) {
  const { title, description, xKey, yKey, color } =
    element.props as {
      title?: string;
      description?: string;
      xKey?: string;
      yKey?: string;
      color?: string;
    };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const valueKey = yKey || "value";
  const dateKey = xKey || "date";
  const lineColor = color || CHART_COLORS[2];
  const chartData = useMemo(
    () => coerceTimeSeriesRows(data, dateKey, valueKey),
    [data, dateKey, valueKey],
  );

  return (
    <ChartCardShell
      title={title}
      description={description}
      icon={<ChartLineIcon className="size-5" weight="duotone" />}
      isLoading={isLoading}
      error={error}
      isEmpty={chartData.length === 0}
      emptyMessage="No data available"
    >
      <BklitLineSeriesChart
        color={lineColor}
        data={chartData}
        dateKey={AI_TIME_KEY}
        heightClassName="h-auto"
        numTicks={5}
        style={{ height: CONTENT_HEIGHT }}
        valueKey={valueKey}
        valueLabel={valueKey}
      />
    </ChartCardShell>
  );
}

function AreaChartComponent({ element }: ComponentRenderProps) {
  const { title, description, xKey, yKey, gradient, color } = element.props as {
    title?: string;
    description?: string;
    xKey?: string;
    yKey?: string;
    gradient?: boolean;
    color?: string;
  };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const valueKey = yKey || "value";
  const dateKey = xKey || "date";
  const areaColor = color || CHART_COLORS[1];
  const chartData = useMemo(
    () => coerceTimeSeriesRows(data, dateKey, valueKey),
    [data, dateKey, valueKey],
  );

  return (
    <ChartCardShell
      title={title}
      description={description}
      icon={<StackIcon className="size-5" weight="duotone" />}
      isLoading={isLoading}
      error={error}
      isEmpty={chartData.length === 0}
      emptyMessage="No data available"
    >
      <BklitAreaSeriesChart
        color={areaColor}
        data={chartData}
        dateKey={AI_TIME_KEY}
        gradient={gradient !== false}
        heightClassName="h-auto"
        numTicks={5}
        style={{ height: CONTENT_HEIGHT }}
        valueKey={valueKey}
        valueLabel={valueKey}
      />
    </ChartCardShell>
  );
}

function PieChartComponent({ element }: ComponentRenderProps) {
  const { title, description, nameKey, valueKey } =
    element.props as {
      title?: string;
      description?: string;
      nameKey?: string;
      valueKey?: string;
    };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const labelKey = nameKey || "name";
  const metricKey = valueKey || "value";
  const chartData = data.map((row, index) => ({
    label: formatTickLabel(row[labelKey], 16),
    value: Number(row[metricKey] ?? 0),
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));

  return (
    <ChartCardShell
      title={title}
      description={description}
      icon={<ChartPieIcon className="size-5" weight="duotone" />}
      isLoading={isLoading}
      error={error}
      isEmpty={data.length === 0}
      emptyMessage="No data available"
    >
      <BklitDonutChart
        data={chartData}
        heightClassName="h-auto"
        style={{ height: PIE_CONTENT_HEIGHT }}
      />
    </ChartCardShell>
  );
}

function DataTableComponent({ element }: ComponentRenderProps) {
  const { title, description, columns, limit } = element.props as {
    title?: string;
    description?: string;
    columns?: unknown[];
    limit?: number;
  };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const tableRows = useMemo(() => {
    const safeLimit = typeof limit === "number" && limit > 0 ? limit : undefined;
    return safeLimit ? data.slice(0, safeLimit) : data;
  }, [data, limit]);

  const tableColumns = useMemo(() => {
    if (Array.isArray(columns) && columns.length > 0) {
      const normalized = columns
        .map((column) => normalizeColumnName(column))
        .filter((column): column is string => Boolean(column));

      if (normalized.length > 0) {
        return Array.from(new Set(normalized));
      }
    }
    const first = tableRows[0];
    return first ? Object.keys(first).slice(0, 10) : [];
  }, [columns, tableRows]);

  return (
    <ChartCardShell
      title={title || "Data Table"}
      description={description}
      icon={<StackIcon className="size-5" weight="duotone" />}
      isLoading={isLoading}
      error={error}
      isEmpty={tableRows.length === 0}
      emptyMessage="No rows available"
    >
      <div className="max-h-[320px] overflow-auto rounded-md border border-zinc-200">
        <Table className="text-xs">
          <TableHeader className="bg-zinc-50">
            <TableRow>
              {tableColumns.map((column) => (
                <TableHead key={column} className="h-9 font-medium text-zinc-700">
                  {formatTickLabel(column, 22)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableRows.map((row, rowIndex) => (
              <TableRow key={`row-${rowIndex}`}>
                {tableColumns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`} className="max-w-[220px] truncate">
                    {formatCellValue(resolveRowValue(row, column))}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ChartCardShell>
  );
}

function FallbackCardComponent({ element }: ComponentRenderProps) {
  const { title, description, reason, suggestion, examplePrompt } =
    element.props as {
      title?: string;
      description?: string;
      reason?: string;
      suggestion?: string;
      examplePrompt?: string;
    };

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="border-b border-zinc-200 px-4 py-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 font-medium text-zinc-900">
          <StackIcon className="size-5" weight="duotone" />
          {title || "Could not render that chart yet"}
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          {description || "Try a supported chart type or a clearer metric/dimension prompt."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 text-sm sm:p-6">
        {reason ? <p className="text-zinc-700">{reason}</p> : null}
        {suggestion ? (
          <p className="text-zinc-700">
            Suggested request: <span className="font-medium">{suggestion}</span>
          </p>
        ) : null}
        {examplePrompt ? (
          <p className="text-zinc-500">Example: {examplePrompt}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MetricCardComponent({ element }: ComponentRenderProps) {
  const { title, format, prefix, suffix } = element.props as {
    title?: string;
    format?: "number" | "percent" | "currency";
    prefix?: string;
    suffix?: string;
  };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const value = getMetricValueFromRows(data);

  const formatValue = (val: number) => {
    switch (format) {
      case "percent":
        return `${(val * 100).toFixed(1)}%`;
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(val);
      default:
        return new Intl.NumberFormat("en-US").format(val);
    }
  };

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="border-b border-zinc-200 px-4 py-3 sm:px-6">
        <CardTitle className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          {title || "Metric"}
        </CardTitle>
      </CardHeader>
      <CardContent className="grow p-4 sm:p-6">
        {error ? (
          <div className="text-xs text-red-600">{error}</div>
        ) : isLoading ? (
          <Skeleton className="h-10 w-28 rounded" />
        ) : (
          <div className="text-3xl font-semibold tracking-tight text-zinc-900">
            {prefix}
            {formatValue(value)}
            {suffix}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartGridComponent({ element, children }: ComponentRenderProps) {
  const { columns } = element.props as { columns?: number };
  const gridCols = columns || 2;

  return (
    <div
      className={cn(
        "grid gap-4 sm:gap-6",
        gridCols === 1 && "grid-cols-1",
        gridCols === 2 && "grid-cols-1 xl:grid-cols-2",
        gridCols === 3 && "grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3",
        gridCols === 4 && "grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

export const chartRegistry: ComponentRegistry = {
  BarChart: BarChartComponent,
  LineChart: LineChartComponent,
  AreaChart: AreaChartComponent,
  PieChart: PieChartComponent,
  DataTable: DataTableComponent,
  FallbackCard: FallbackCardComponent,
  MetricCard: MetricCardComponent,
  ChartGrid: ChartGridComponent,
};

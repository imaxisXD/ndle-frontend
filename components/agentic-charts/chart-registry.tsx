"use client";

/**
 * Chart Component Registry
 *
 * Maps JSON Render catalog component types to chart components styled with
 * the same primitives used by the native analytics charts.
 */

import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart as RechartsFunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Pie,
  PieChart as RechartsPieChart,
  Radar,
  RadarChart as RechartsRadarChart,
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
  Scatter,
  ScatterChart as RechartsScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useChartQueryContext } from "@/hooks/chart-query-context";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import {
  ChartBarIcon,
  ChartLineIcon,
  ChartPieIcon,
  StackIcon,
} from "@phosphor-icons/react";
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
  icon?: React.ReactNode;
  isLoading: boolean;
  error?: string | null;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
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

function BaseTooltipContent(props: ComponentProps<typeof ChartTooltipContent>) {
  return (
    <ChartTooltipContent
      {...props}
      className="rounded-sm bg-linear-to-br from-black/80 to-black text-white *:text-inherit **:text-inherit"
      labelClassName="text-white font-medium"
      indicator="dot"
    />
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
  const gradientId = useMemo(
    () => `ai-bar-gradient-${String(element.key).replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [element.key],
  );

  const chartConfig: ChartConfig = {
    [valueKey]: {
      label: valueKey,
      color: barColor,
    },
  };

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
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full min-w-0"
        style={{ height: CONTENT_HEIGHT }}
      >
        <RechartsBarChart
          data={data}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{ left: 8, right: 16 }}
          barCategoryGap="18%"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={barColor} stopOpacity={0.75} />
              <stop offset="100%" stopColor={barColor} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            horizontal={!isHorizontal}
            vertical={false}
            strokeDasharray="5"
            stroke="var(--border)"
            strokeOpacity={1}
          />
          {isHorizontal ? (
            <>
              <YAxis
                dataKey={categoryKey}
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={88}
                tick={{ fontSize: 12, fill: "#71717a" }}
                tickFormatter={(value) => formatTickLabel(value, 12)}
              />
              <XAxis type="number" tickLine={false} axisLine={false} />
            </>
          ) : (
            <>
              <XAxis
                dataKey={categoryKey}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
                tickFormatter={(value) => formatTickLabel(value, 10)}
              />
              <YAxis tickLine={false} axisLine={false} width={40} />
            </>
          )}
          <ChartTooltip cursor={false} content={<BaseTooltipContent />} />
          <Bar
            dataKey={valueKey}
            fill={`url(#${gradientId})`}
            radius={isHorizontal ? 4 : [4, 4, 0, 0]}
            barSize={isHorizontal ? 24 : 28}
          />
        </RechartsBarChart>
      </ChartContainer>
    </ChartCardShell>
  );
}

function LineChartComponent({ element }: ComponentRenderProps) {
  const { title, description, xKey, yKey, smooth, showDots } =
    element.props as {
      title?: string;
      description?: string;
      xKey?: string;
      yKey?: string;
      smooth?: boolean;
      showDots?: boolean;
    };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const valueKey = yKey || "value";
  const categoryKey = xKey || "label";
  const lineColor = CHART_COLORS[2];
  const chartConfig: ChartConfig = {
    [valueKey]: {
      label: valueKey,
      color: lineColor,
    },
  };

  return (
    <ChartCardShell
      title={title}
      description={description}
      icon={<ChartLineIcon className="size-5" weight="duotone" />}
      isLoading={isLoading}
      error={error}
      isEmpty={data.length === 0}
      emptyMessage="No data available"
    >
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full min-w-0"
        style={{ height: CONTENT_HEIGHT }}
      >
        <RechartsLineChart data={data} margin={{ left: 8, right: 16 }}>
          <CartesianGrid
            vertical={false}
            strokeDasharray="5"
            stroke="var(--border)"
            strokeOpacity={1}
          />
          <XAxis
            dataKey={categoryKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value) => formatTickLabel(value, 10)}
          />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip cursor={false} content={<BaseTooltipContent />} />
          <Line
            dataKey={valueKey}
            type={smooth !== false ? "monotone" : "linear"}
            stroke={lineColor}
            strokeWidth={2}
            dot={showDots !== false}
            activeDot={{ r: 5 }}
          />
        </RechartsLineChart>
      </ChartContainer>
    </ChartCardShell>
  );
}

function AreaChartComponent({ element }: ComponentRenderProps) {
  const { title, description, xKey, yKey, gradient } = element.props as {
    title?: string;
    description?: string;
    xKey?: string;
    yKey?: string;
    gradient?: boolean;
  };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const valueKey = yKey || "value";
  const categoryKey = xKey || "label";
  const areaColor = CHART_COLORS[1];
  const gradientId = useMemo(
    () =>
      `ai-area-gradient-${String(element.key).replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [element.key],
  );

  const chartConfig: ChartConfig = {
    [valueKey]: {
      label: valueKey,
      color: areaColor,
    },
  };

  return (
    <ChartCardShell
      title={title}
      description={description}
      icon={<StackIcon className="size-5" weight="duotone" />}
      isLoading={isLoading}
      error={error}
      isEmpty={data.length === 0}
      emptyMessage="No data available"
    >
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full min-w-0"
        style={{ height: CONTENT_HEIGHT }}
      >
        <RechartsAreaChart data={data} margin={{ left: 8, right: 16 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={areaColor} stopOpacity={0.35} />
              <stop offset="95%" stopColor={areaColor} stopOpacity={0.06} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="5"
            stroke="var(--border)"
            strokeOpacity={1}
          />
          <XAxis
            dataKey={categoryKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value) => formatTickLabel(value, 10)}
          />
          <YAxis tickLine={false} axisLine={false} width={40} />
          <ChartTooltip cursor={false} content={<BaseTooltipContent />} />
          <Area
            dataKey={valueKey}
            type="monotone"
            stroke={areaColor}
            strokeWidth={2}
            fill={gradient !== false ? `url(#${gradientId})` : areaColor}
            fillOpacity={gradient !== false ? 1 : 0.2}
          />
        </RechartsAreaChart>
      </ChartContainer>
    </ChartCardShell>
  );
}

function PieChartComponent({ element }: ComponentRenderProps) {
  const { title, description, nameKey, valueKey, showLabels, donut } =
    element.props as {
      title?: string;
      description?: string;
      nameKey?: string;
      valueKey?: string;
      showLabels?: boolean;
      donut?: boolean;
    };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const labelKey = nameKey || "name";
  const metricKey = valueKey || "value";
  const chartConfig: ChartConfig = {
    [metricKey]: {
      label: metricKey,
      color: CHART_COLORS[0],
    },
  };

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
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full min-w-0"
        style={{ height: PIE_CONTENT_HEIGHT }}
      >
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={metricKey}
            nameKey={labelKey}
            cx="50%"
            cy="50%"
            innerRadius={donut ? 55 : 0}
            outerRadius={86}
            label={showLabels !== false}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </Pie>
          <ChartTooltip cursor={false} content={<BaseTooltipContent />} />
          <Legend
            verticalAlign="bottom"
            formatter={(value) => formatTickLabel(value, 16)}
            wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
          />
        </RechartsPieChart>
      </ChartContainer>
    </ChartCardShell>
  );
}

function ScatterChartComponent({ element }: ComponentRenderProps) {
  const { title, description, xKey, yKey, zKey, color } = element.props as {
    title?: string;
    description?: string;
    xKey?: string;
    yKey?: string;
    zKey?: string;
    color?: string;
  };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const xDataKey = xKey || "x";
  const yDataKey = yKey || "y";
  const zDataKey = zKey;
  const scatterColor = color || CHART_COLORS[4];

  const chartData = useMemo(
    () =>
      data.map((row) => ({
        ...row,
        [xDataKey]: isNumericLike(row[xDataKey]) ? Number(row[xDataKey]) : row[xDataKey],
        [yDataKey]: isNumericLike(row[yDataKey]) ? Number(row[yDataKey]) : row[yDataKey],
        ...(zDataKey
          ? {
              [zDataKey]: isNumericLike(row[zDataKey])
                ? Number(row[zDataKey])
                : row[zDataKey],
            }
          : {}),
      })),
    [data, xDataKey, yDataKey, zDataKey],
  );

  const xType: "number" | "category" = chartData.every((row) =>
    isNumericLike(row[xDataKey]),
  )
    ? "number"
    : "category";
  const yType: "number" | "category" = chartData.every((row) =>
    isNumericLike(row[yDataKey]),
  )
    ? "number"
    : "category";

  const chartConfig: ChartConfig = {
    [yDataKey]: {
      label: yDataKey,
      color: scatterColor,
    },
  };

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
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full min-w-0"
        style={{ height: CONTENT_HEIGHT }}
      >
        <RechartsScatterChart margin={{ left: 8, right: 16 }}>
          <CartesianGrid
            vertical={false}
            strokeDasharray="5"
            stroke="var(--border)"
            strokeOpacity={1}
          />
          <XAxis
            dataKey={xDataKey}
            type={xType}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value) => formatTickLabel(value, 10)}
          />
          <YAxis
            dataKey={yDataKey}
            type={yType}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          {zDataKey ? <ZAxis dataKey={zDataKey} range={[40, 320]} /> : null}
          <ChartTooltip cursor={false} content={<BaseTooltipContent />} />
          <Scatter data={chartData} fill={scatterColor} />
        </RechartsScatterChart>
      </ChartContainer>
    </ChartCardShell>
  );
}

function RadarChartComponent({ element }: ComponentRenderProps) {
  const { title, description, categoryKey, valueKey } = element.props as {
    title?: string;
    description?: string;
    categoryKey?: string;
    valueKey?: string;
  };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const labelKey = categoryKey || "category";
  const metricKey = valueKey || "value";
  const radarColor = CHART_COLORS[1];
  const chartConfig: ChartConfig = {
    [metricKey]: {
      label: metricKey,
      color: radarColor,
    },
  };

  return (
    <ChartCardShell
      title={title}
      description={description}
      icon={<ChartLineIcon className="size-5" weight="duotone" />}
      isLoading={isLoading}
      error={error}
      isEmpty={data.length === 0}
      emptyMessage="No data available"
    >
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full min-w-0"
        style={{ height: CONTENT_HEIGHT }}
      >
        <RechartsRadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis
            dataKey={labelKey}
            tick={(props) => {
              const { x, y, payload } = props as {
                x: number;
                y: number;
                payload: { value: unknown };
              };
              return (
                <text x={x} y={y} textAnchor="middle" className="fill-zinc-500 text-[11px]">
                  {formatTickLabel(payload?.value, 10)}
                </text>
              );
            }}
          />
          <PolarRadiusAxis axisLine={false} tickLine={false} />
          <ChartTooltip cursor={false} content={<BaseTooltipContent />} />
          <Radar
            dataKey={metricKey}
            stroke={radarColor}
            fill={radarColor}
            fillOpacity={0.32}
          />
        </RechartsRadarChart>
      </ChartContainer>
    </ChartCardShell>
  );
}

function RadialBarChartComponent({ element }: ComponentRenderProps) {
  const { title, description, nameKey, valueKey } = element.props as {
    title?: string;
    description?: string;
    nameKey?: string;
    valueKey?: string;
  };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const labelKey = nameKey || "name";
  const metricKey = valueKey || "value";
  const chartConfig: ChartConfig = {
    [metricKey]: {
      label: metricKey,
      color: CHART_COLORS[0],
    },
  };

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
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full min-w-0"
        style={{ height: CONTENT_HEIGHT }}
      >
        <RechartsRadialBarChart
          data={data}
          innerRadius="20%"
          outerRadius="90%"
          barSize={14}
        >
          <PolarAngleAxis type="number" domain={[0, "dataMax"]} tick={false} />
          <ChartTooltip cursor={false} content={<BaseTooltipContent />} />
          <RadialBar background dataKey={metricKey} cornerRadius={6}>
            {data.map((_, index) => (
              <Cell
                key={`radial-cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
          </RadialBar>
          <Legend
            verticalAlign="bottom"
            formatter={(value) => formatTickLabel(value, 16)}
            payload={data.map((entry, index) => ({
              value: formatCellValue(entry[labelKey]),
              type: "square",
              color: CHART_COLORS[index % CHART_COLORS.length],
            }))}
            wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
          />
        </RechartsRadialBarChart>
      </ChartContainer>
    </ChartCardShell>
  );
}

function FunnelChartComponent({ element }: ComponentRenderProps) {
  const { title, description, nameKey, valueKey } = element.props as {
    title?: string;
    description?: string;
    nameKey?: string;
    valueKey?: string;
  };

  const { data, error, isLoading } = useChartData(element.props.query as string);

  const labelKey = nameKey || "name";
  const metricKey = valueKey || "value";
  const chartConfig: ChartConfig = {
    [metricKey]: {
      label: metricKey,
      color: CHART_COLORS[0],
    },
  };

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
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full min-w-0"
        style={{ height: CONTENT_HEIGHT }}
      >
        <RechartsFunnelChart>
          <ChartTooltip cursor={false} content={<BaseTooltipContent />} />
          <Funnel data={data} dataKey={metricKey} nameKey={labelKey}>
            {data.map((_, index) => (
              <Cell
                key={`funnel-cell-${index}`}
                fill={CHART_COLORS[index % CHART_COLORS.length]}
              />
            ))}
            <LabelList
              position="right"
              dataKey={labelKey}
              fill="#52525b"
              stroke="none"
              formatter={(value: unknown) => formatTickLabel(value, 18)}
            />
          </Funnel>
        </RechartsFunnelChart>
      </ChartContainer>
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
  ScatterChart: ScatterChartComponent,
  RadarChart: RadarChartComponent,
  RadialBarChart: RadialBarChartComponent,
  FunnelChart: FunnelChartComponent,
  DataTable: DataTableComponent,
  FallbackCard: FallbackCardComponent,
  MetricCard: MetricCardComponent,
  ChartGrid: ChartGridComponent,
};

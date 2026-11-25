"use client";

import type { CSSProperties, ReactNode } from "react";
import { DotmatrixLoaderIcon } from "@/components/ui/dotmatrix-loader-icon";
import { EmptyStateImage } from "@/components/empty-state-image";
import { cn } from "@/lib/utils";

const numberFormatter = new Intl.NumberFormat("en-US");

export const chartAccent = "var(--chart-line-primary)";
export const chartInk = "var(--chart-line-secondary)";
export const chartMuted = "var(--muted)";

export type ChartRecord = Record<string, unknown>;

export function getRecordValue(point: ChartRecord, key: string): unknown {
  return point[key];
}

export function formatChartNumber(value: unknown): string {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numberFormatter.format(numeric) : "0";
}

export function chartTotal<T extends object>(data: T[] | undefined, valueKey: string): number {
  return (data ?? []).reduce((sum, item) => {
    const value = getRecordValue(item as ChartRecord, valueKey);
    return sum + (typeof value === "number" ? value : Number(value ?? 0));
  }, 0);
}

function EmptyState({
  title = "No analytics yet",
  description = "This link hasn’t received any clicks in the selected range.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <EmptyStateImage alt="" className="mb-3 w-full max-w-[170px]" name="noAnalytics" />
      <p className="text-foreground font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{description}</p>
    </div>
  );
}

export function ChartStateFrame({
  isLoading,
  isEmpty,
  heightClassName,
  loadingTitle = "Loading analytics",
  emptyTitle,
  emptyDescription,
  loadingFallback,
  style,
  children,
}: {
  isLoading?: boolean;
  isEmpty?: boolean;
  heightClassName: string;
  loadingTitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingFallback?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={cn("relative w-full", heightClassName)} style={style}>
      {isLoading && loadingFallback ? (
        <div className="absolute inset-0">{loadingFallback}</div>
      ) : isLoading ? (
        <div className="absolute inset-0 grid place-items-center">
          <DotmatrixLoaderIcon title={loadingTitle} />
        </div>
      ) : isEmpty ? (
        <div className="absolute inset-0 grid place-items-center">
          <EmptyState title={emptyTitle} description={emptyDescription} />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

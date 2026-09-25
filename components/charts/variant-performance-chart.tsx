"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import { Shuffle } from "iconoir-react"; // Icon for A/B testing

export const description = "A bar chart showing A/B test variant performance";

/** Maps a variant_id to its short name and destination URL. */
export type VariantLabels = Record<string, { name: string; url?: string }>;

/**
 * The original destination is served as "control" (A); stored test variants are
 * projected as variant_0, variant_1, … and are shown as Variant B, C, ….
 */
export function getVariantName(variantId: string): string {
  if (variantId === "control") return "Control";
  const index = /^variant_(\d+)$/.exec(variantId)?.[1];
  return index === undefined
    ? `Variant ${variantId}`
    : `Variant ${String.fromCharCode(66 + Number(index))}`;
}

export function VariantPerformanceChart({
  data,
  variantMap,
  isLoading,
}: {
  data?: Array<{
    variant_id: string;
    clicks: number;
    percentage: string | number;
  }>;
  variantMap?: VariantLabels;
  isLoading?: boolean;
}) {
  // Bars use the short name; destinations are listed under the chart, since
  // a URL in a bar label gets cut to "Control (htt…".
  const chartData = (data || []).map((item) => ({
    ...item,
    label:
      variantMap?.[item.variant_id]?.name || getVariantName(item.variant_id),
    url: variantMap?.[item.variant_id]?.url,
  }));
  const destinations = chartData.filter((item) => item.url);

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Shuffle className="size-5" />
          A/B Test Performance
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution across variants
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BklitHorizontalBarChart
          barWidth={28}
          data={chartData}
          emptyDescription="Waiting for traffic on your variants."
          emptyTitle="No A/B data yet"
          heightClassName="h-[280px]"
          isLoading={isLoading}
          labelKey="label"
          labelWidth={112}
          loadingTitle="Loading variant analytics"
          valueKey="clicks"
        />
        {!isLoading && destinations.length > 0 ? (
          <ul className="mt-4 space-y-1.5 text-xs">
            {destinations.map((item) => (
              <li
                key={item.variant_id}
                // minmax(0,1fr): a long URL can't widen the card.
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-2"
              >
                <span className="shrink-0 font-medium">{item.label}</span>
                <span
                  className="text-muted-foreground min-w-0 truncate"
                  title={item.url}
                >
                  {item.url}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

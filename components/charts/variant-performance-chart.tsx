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
  variantMap?: Record<string, string>; // Maps variant_id to display name or URL
  isLoading?: boolean;
}) {
  // Enhance data with labels
  const chartData = (data || []).map((item) => ({
    ...item,
    label:
      variantMap?.[item.variant_id] ||
      (item.variant_id === "control"
        ? "Control"
        : `Variant ${item.variant_id.replace("variant_", "")}`),
  }));

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
          heightClassName="h-[250px]"
          isLoading={isLoading}
          labelKey="label"
          labelWidth={112}
          loadingTitle="Loading variant analytics"
          valueKey="clicks"
        />
      </CardContent>
    </Card>
  );
}

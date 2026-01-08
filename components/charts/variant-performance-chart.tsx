"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Shuffle } from "iconoir-react"; // Icon for A/B testing
import { CircleGridLoaderIcon } from "@/components/icons";

export const description = "A bar chart showing A/B test variant performance";

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "hsl(var(--chart-1))",
  },
  label: {
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

// Colors for variants (using chart theme colors)
const VARIANT_COLORS = [
  "var(--color-purple-500)",
  "var(--color-blue-500)",
  "var(--color-green-500)",
  "var(--color-orange-500)",
  "var(--color-red-500)",
];

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
  const showEmptyState = !isLoading && Array.isArray(data) && data.length === 0;

  // Enhance data with labels
  const chartData = (data || []).map((item, index) => ({
    ...item,
    label:
      variantMap?.[item.variant_id] ||
      (item.variant_id === "control"
        ? "Control"
        : `Variant ${item.variant_id.replace("variant_", "")}`),
    fill: VARIANT_COLORS[index % VARIANT_COLORS.length],
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
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
          isLoading={isLoading}
          showEmptyState={showEmptyState}
          loadingContent={
            <CircleGridLoaderIcon
              title="Loading variant analytics"
              className="text-primary"
            />
          }
          emptyStateContent={
            <div className="text-center">
              <p className="text-foreground font-medium">No A/B data yet</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Waiting for traffic on your variants.
              </p>
            </div>
          }
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 16,
              left: 0,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={100} // Give space for variant names
              tickFormatter={(value) =>
                value.length > 15 ? value.slice(0, 15) + "..." : value
              }
            />
            <XAxis dataKey="clicks" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  className="bg-white/90 backdrop-blur-lg"
                  indicator="dashed"
                  labelFormatter={(label, payload) => {
                    // Find full item to get percentage
                    const row = payload?.[0]?.payload;
                    return `${label} (${row?.percentage}%)`;
                  }}
                />
              }
            />
            <Bar dataKey="clicks" layout="vertical" radius={4} maxBarSize={30}>
              <LabelList
                dataKey="clicks"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

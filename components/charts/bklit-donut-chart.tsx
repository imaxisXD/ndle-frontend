"use client";

import type { CSSProperties } from "react";
import { PieCenter } from "@/components/charts/pie-center";
import { PieChart } from "@/components/charts/pie-chart";
import { PieSlice } from "@/components/charts/pie-slice";
import { ChartStateFrame } from "@/components/charts/bklit-shared";

export function BklitDonutChart({
  data,
  isLoading,
  heightClassName = "h-[250px]",
  emptyTitle,
  emptyDescription,
  style,
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  isLoading?: boolean;
  heightClassName?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  style?: CSSProperties;
}) {
  // Zero-value slices still draw a padded gap, so leave them out of the ring.
  const slices = data.filter((item) => item.value > 0);
  const isSingleSlice = slices.length === 1;

  return (
    <ChartStateFrame
      emptyDescription={emptyDescription}
      emptyTitle={emptyTitle}
      heightClassName={heightClassName}
      isEmpty={slices.length === 0}
      isLoading={isLoading}
      style={style}
    >
      <div className="grid h-full place-items-center">
        <PieChart
          className="max-h-full max-w-full"
          cornerRadius={isSingleSlice ? 0 : 4}
          data={slices}
          hoverOffset={4}
          innerRadius={64}
          padAngle={isSingleSlice ? 0 : 0.045}
          size={220}
        >
          {slices.map((item, index) => (
            <PieSlice
              color={item.color}
              hoverEffect="grow"
              index={index}
              key={item.label}
            />
          ))}
          <PieCenter
            defaultLabel="Traffic"
            valueClassName="text-xl font-semibold tabular-nums"
            labelClassName="text-xs text-muted-foreground"
          />
        </PieChart>
      </div>
    </ChartStateFrame>
  );
}

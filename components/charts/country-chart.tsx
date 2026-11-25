"use client";

import { Globe } from "iconoir-react";
import { ExpandableBarChartCard } from "@/components/charts/expandable-bar-chart-card";
import { countryCodeToName } from "@/lib/utils";

export function CountryChart({
  data,
  isLoading,
  limit = 7,
  className,
}: {
  data?: Array<{ country: string; clicks: number }>;
  isLoading?: boolean;
  limit?: number;
  className?: string;
}) {
  return (
    <ExpandableBarChartCard
      title="Top Countries"
      description="Clicks by geographic location"
      dialogTitle="All Countries"
      expandLabel="View all countries"
      icon={<Globe className="size-5" aria-hidden="true" />}
      data={data}
      labelKey="country"
      labelFormatter={(value) => countryCodeToName(String(value))}
      emptyTitle="No location data"
      emptyDescription="No location data available."
      isLoading={isLoading}
      limit={limit}
      className={className}
    />
  );
}

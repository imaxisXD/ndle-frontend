"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-select";
import { AnalyticsRange } from "@/lib/analyticsRanges";
import { Calendar } from "iconoir-react";

const timeRanges: { value: AnalyticsRange; label: string }[] = [
  { value: "24h", label: "Today (UTC)" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "3mo", label: "Last 3 months" },
  { value: "12mo", label: "Last 12 months" },
  { value: "mtd", label: "Month to Date" },
  { value: "qtd", label: "Quarter to Date" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All time" },
];

export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}) {
  return (
    <Select
      items={timeRanges}
      value={value}
      onValueChange={(v) => onChange(v as AnalyticsRange)}
    >
      <SelectTrigger
        size="md"
        className="bg-background flex items-center justify-between gap-2 font-medium shadow-xs drop-shadow-xs"
      >
        <Calendar className="text-primary size-4" strokeWidth={2} />
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent className="gap-2 text-xs">
        {timeRanges.map((range) => (
          <SelectItem key={range.value} value={range.value}>
            {range.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

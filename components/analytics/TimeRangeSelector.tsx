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

export function TimeRangeSelector({
  value,
  onChange,
}: {
  value: AnalyticsRange;
  onChange: (v: AnalyticsRange) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AnalyticsRange)}>
      <SelectTrigger
        size="md"
        className="bg-background flex items-center justify-between gap-2 font-medium shadow-xs drop-shadow-xs"
      >
        <Calendar className="text-primary size-4" strokeWidth={2} />
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent className="gap-2 text-xs">
        <SelectItem value="24h">Last 24 hours</SelectItem>
        <SelectItem value="7d">Last 7 days</SelectItem>
        <SelectItem value="30d">Last 30 days</SelectItem>
        <SelectItem value="3mo">Last 3 months</SelectItem>
        <SelectItem value="12mo">Last 12 months</SelectItem>
        <SelectItem value="mtd">Month to Date</SelectItem>
        <SelectItem value="qtd">Quarter to Date</SelectItem>
        <SelectItem value="ytd">Year to Date</SelectItem>
        <SelectItem value="all">All time</SelectItem>
      </SelectContent>
    </Select>
  );
}

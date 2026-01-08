"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/base-tooltip";
import type { Id } from "@/convex/_generated/dataModel";

interface DaySummary {
  date: string;
  urlId: Id<"urls">;
  totalChecks: number;
  healthyChecks: number;
  avgLatencyMs: number;
  incidentCount: number;
}

interface UptimeStatusBarProps {
  summaries: DaySummary[];
  days?: number;
  className?: string;
}

/**
 * 30-day uptime status bar with colored bars and tooltips
 */
export function UptimeStatusBar({
  summaries,
  days = 30,
  className,
}: UptimeStatusBarProps) {
  const allDays = getLast30Days(days);

  const bars = allDays.map((date) => {
    const summary = summaries.find((s) => s.date === date);

    if (!summary) {
      return { date, uptime: null, incidents: 0, hasData: false };
    }

    const uptime =
      summary.totalChecks > 0
        ? (summary.healthyChecks / summary.totalChecks) * 100
        : 100;

    return {
      date,
      uptime,
      incidents: summary.incidentCount,
      hasData: true,
    };
  });

  return (
    <div className={cn("flex gap-0.5", className)}>
      {bars.map((bar) => (
        <Tooltip key={bar.date}>
          <TooltipTrigger>
            <div
              className={cn(
                "h-8 w-1.5 cursor-default rounded-sm transition-colors hover:opacity-80",
                getBarColor(bar.uptime),
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <p className="font-medium">{formatDate(bar.date)}</p>
              <p>
                Uptime: {bar.hasData ? `${bar.uptime?.toFixed(1)}%` : "No data"}
              </p>
              {bar.incidents > 0 && (
                <p className="text-yellow-600">
                  {bar.incidents} incident{bar.incidents > 1 ? "s" : ""}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function getBarColor(uptime: number | null): string {
  if (uptime === null) return "bg-gray-200";
  if (uptime >= 99.9) return "bg-green-500";
  if (uptime >= 99) return "bg-green-400";
  if (uptime >= 95) return "bg-yellow-500";
  return "bg-red-500";
}

function getLast30Days(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    result.push(date.toISOString().split("T")[0]);
  }
  return result;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

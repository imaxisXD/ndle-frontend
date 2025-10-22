"use client";

import LinkWithIcon from "@/components/ui/link-with-icon";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { LiveClickHero } from "@/components/charts/live-click-hero";
import type { AnalyticsRange } from "@/lib/analyticsRanges";

export function LinkHeader({
  shortUrl,
  range,
  onRangeChange,
  totalClickCounts,
}: {
  shortUrl: string;
  range: AnalyticsRange;
  onRangeChange: (r: AnalyticsRange) => void;
  totalClickCounts: number;
}) {
  return (
    <header className="space-y-4">
      <div className="text-primary mb-14 flex flex-col items-start gap-3">
        <LinkWithIcon link={shortUrl} href={`https://${shortUrl}`} />
        <p className="text-muted-foreground text-sm">
          Link analytics and settings
        </p>
      </div>
      <div className="flex items-center justify-end gap-2">
        <TimeRangeSelector value={range} onChange={onRangeChange} />
      </div>
      <LiveClickHero counterValue={totalClickCounts} />
    </header>
  );
}

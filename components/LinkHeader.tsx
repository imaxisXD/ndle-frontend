"use client";

import LinkWithIcon from "@/components/ui/link-with-icon";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { LiveClickHero } from "@/components/charts/live-click-hero";
import { LinkActionsBar } from "@/components/LinkActionsBar";
import type { AnalyticsRange } from "@/lib/analyticsRanges";
import { formatRelative } from "@/lib/utils";
import { LinkIcon } from "@phosphor-icons/react";

export function LinkHeader({
  shortUrl,
  fullUrl,
  range,
  onRangeChange,
  totalClickCounts,
  qrEnabled,
  expiresAt,
  creationTime,
  onDownloadQR,
}: {
  shortUrl: string;
  fullUrl?: string;
  range: AnalyticsRange;
  onRangeChange: (r: AnalyticsRange) => void;
  totalClickCounts: number;
  qrEnabled?: boolean;
  expiresAt?: number;
  creationTime?: number;
  onDownloadQR?: () => void;
}) {
  // Determine link status
  const isExpired = expiresAt ? expiresAt < Date.now() : false;
  const status: "active" | "expired" | "scheduled" = isExpired
    ? "expired"
    : "active";

  return (
    <header className="space-y-6">
      {/* Main Header Section */}
      <div className="flex flex-col gap-4">
        {/* Short URL and Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col items-start gap-2">
            <LinkWithIcon link={shortUrl} href={`https://${shortUrl}`} />

            {/* Destination URL Preview */}
            {fullUrl && (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <LinkIcon className="size-3.5 shrink-0" />
                <span className="max-w-xs truncate md:max-w-md" title={fullUrl}>
                  {fullUrl}
                </span>
              </div>
            )}

            {/* Creation time */}
            {creationTime && (
              <p className="text-muted-foreground/70 text-xs">
                [Created {formatRelative(creationTime)}]
              </p>
            )}
          </div>

          {/* Actions Bar */}
          <LinkActionsBar
            shortUrl={shortUrl}
            fullUrl={fullUrl || ""}
            qrEnabled={qrEnabled}
            status={status}
            onDownloadQR={onDownloadQR}
          />
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex items-center justify-end gap-2">
        <TimeRangeSelector value={range} onChange={onRangeChange} />
      </div>

      {/* Live Click Counter */}
      <LiveClickHero counterValue={totalClickCounts} />
    </header>
  );
}

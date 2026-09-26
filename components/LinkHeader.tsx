"use client";

import LinkWithIcon from "@/components/ui/link-with-icon";
import { TimeRangeSelector } from "@/components/analytics/TimeRangeSelector";
import { LiveClickHero } from "@/components/charts/live-click-hero";
import { LinkActionsBar } from "@/components/LinkActionsBar";
import { Switch } from "@/components/ui/switch";
import type { AnalyticsRange } from "@/lib/analyticsRanges";
import { formatRelative } from "@/lib/utils";
import { LinkIcon } from "@phosphor-icons/react";

export function LinkHeader({
  shortUrl,
  fullUrl,
  range,
  onRangeChange,
  excludeBots = false,
  onExcludeBotsChange,
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
  excludeBots?: boolean;
  onExcludeBotsChange?: (value: boolean) => void;
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
        {/* Side by side only from lg: with the sidebar rail, tablets are too
            narrow for a long short link plus the full actions bar. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <LinkWithIcon
              link={shortUrl}
              href={`https://${shortUrl}`}
              className="max-w-full justify-start text-2xl [overflow-wrap:anywhere] sm:text-3xl"
              iconClassName="size-4"
            />

            {/* Destination URL Preview */}
            {fullUrl && (
              <div className="text-muted-foreground flex w-full min-w-0 items-center gap-2 text-sm">
                <LinkIcon className="size-3.5 shrink-0" />
                <span className="min-w-0 truncate sm:max-w-md" title={fullUrl}>
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

      {/* Filters: bots are included unless excluded here. */}
      <div className="flex items-center justify-end gap-4">
        {onExcludeBotsChange && (
          <div className="flex items-center gap-2">
            <Switch
              id="link-exclude-bots"
              checked={excludeBots}
              onCheckedChange={onExcludeBotsChange}
              size="sm"
            />
            <label
              htmlFor="link-exclude-bots"
              className="text-muted-foreground cursor-pointer text-xs font-medium"
            >
              Exclude bots
            </label>
          </div>
        )}
        <TimeRangeSelector value={range} onChange={onRangeChange} />
      </div>

      {/* Live Click Counter */}
      <LiveClickHero counterValue={totalClickCounts} />
    </header>
  );
}

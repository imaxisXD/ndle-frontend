"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { makeShortLink } from "@/lib/config";
import { NavLink } from "react-router";
import { NavArrowRight } from "iconoir-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/base-tooltip";
import { UrlFavicon } from "@/components/url-favicon";

export interface TopLink {
  url: string;
  originalUrl: string;
  clicks: number;
  change: string;
  createdAt: number;
}

interface TopLinksChartProps {
  data: TopLink[];
  isLoading?: boolean;
  limit?: number;
  className?: string;
}

export function TopLinksChart({
  data,
  isLoading = false,
  limit = 5,
  className,
}: TopLinksChartProps) {
  const displayData = data.slice(0, limit);

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="mb-5">
          <h3 className="text-base font-medium">Top Performing Links</h3>
          <p className="text-muted-foreground mt-1 text-xs">
            Most clicked links in the selected period
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : displayData.length === 0 ? (
          <div className="text-muted-foreground flex h-24 items-center justify-center text-sm">
            No link activity found.
          </div>
        ) : (
          <div className="space-y-0.5">
            {displayData.map((link, index) => {
              const shortLink = makeShortLink(link.url);
              return (
                <div
                  key={link.url}
                  className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-zinc-50"
                >
                  {/* Rank Badge - Cleaner, text-based with subtle color */}
                  <div className="flex w-6 shrink-0 justify-center">
                    <span className="text-sm font-medium text-zinc-400">
                      {index + 1}
                    </span>
                  </div>

                  {/* Favicon + Link Info */}
                  <div className="min-w-0 flex-1 pl-2">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <div className="flex items-center gap-2.5">
                            <UrlFavicon url={link.originalUrl} size="sm" />
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="truncate text-sm font-medium text-zinc-900 group-hover:text-black">
                                {shortLink.replace("https://", "")}
                              </span>
                              <span className="truncate text-[11px] text-zinc-400 transition-colors group-hover:text-zinc-500">
                                {link.originalUrl}
                              </span>
                            </div>
                          </div>
                        }
                      />
                      <TooltipContent side="top" className="max-w-sm break-all">
                        {link.originalUrl}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Clicks */}
                  <div className="flex shrink-0 items-center justify-end gap-4 pl-4">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <div className="text-right">
                            <div className="font-mono text-sm font-semibold text-zinc-900">
                              <NumberFlow value={link.clicks} />
                            </div>
                          </div>
                        }
                      />
                      <TooltipContent side="top">Total clicks</TooltipContent>
                    </Tooltip>

                    {/* View Details Action */}
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <NavLink
                            to={`/link/${link.url}`}
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-all group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-900"
                          >
                            <NavArrowRight className="size-4" strokeWidth={2} />
                          </NavLink>
                        }
                      />
                      <TooltipContent side="right">
                        View analytics
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";
import { makeShortLinkWithDomain } from "@/lib/config";
import { NavLink } from "react-router";
import { NavArrowRight } from "iconoir-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/base-tooltip";
import { LinkWithFavicon } from "@/components/ui/link-with-favicon";
import { CopyIcon, LinkIcon, RankingIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";

export interface TopLink {
  url: string;
  originalUrl: string;
  clicks: number;
  change: string;
  createdAt: number;
  customDomain?: string | null;
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
  const reduce = useReducedMotion();
  const { add } = useToast();

  const handleCopy = useCallback(
    (shortUrl: string) => {
      const normalized = /^https?:\/\//i.test(shortUrl)
        ? shortUrl
        : `https://${shortUrl}`;
      navigator.clipboard.writeText(normalized);
      add({
        type: "success",
        title: "Copied",
        description: `Link copied to clipboard`,
      });
    },
    [add],
  );

  return (
    <Card
      className={cn(
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_10px_-2px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-start gap-3">
        <span className="bg-muted flex shrink-0 items-center justify-center rounded-lg p-3">
          <RankingIcon className="size-6" weight="duotone" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <CardTitle className="font-medium">Top Performing Links</CardTitle>
          <CardDescription className="text-xs">
            Most clicked links in the selected period
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col divide-y divide-dashed divide-gray-400/50 p-3">
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: limit }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-sm" />
            ))}
          </div>
        ) : displayData.length === 0 ? (
          <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 text-center">
            <LinkIcon className="size-6 opacity-50" aria-hidden="true" />
            <p className="text-sm">
              No clicks in this period yet.
              <br />
              Share a link to see your top performers.
            </p>
          </div>
        ) : (
          displayData.map((link, index) => {
            const shortLink = makeShortLinkWithDomain(
              link.url,
              link.customDomain,
            );
            const normalizedHref = /^https?:\/\//i.test(shortLink)
              ? shortLink
              : `https://${shortLink}`;
            const slug = link.url;

            return (
              <motion.div
                key={link.url}
                layout="position"
                transition={{
                  layout: { duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] },
                }}
                className="px-2 py-3 first:pt-0 last:pb-0"
              >
                {/* Primary line — rank, link, count and action all aligned */}
                <div className="flex items-center gap-4">
                  {index === 0 ? (
                    <span className="bg-accent text-accent-foreground flex size-6 shrink-0 items-center justify-center rounded-sm text-xs font-semibold tabular-nums">
                      1
                    </span>
                  ) : (
                    <span className="text-muted-foreground w-6 shrink-0 text-center text-sm tabular-nums">
                      [{index + 1}]
                    </span>
                  )}

                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <LinkWithFavicon
                      url={normalizedHref}
                      originalUrl={link.originalUrl}
                      asCode
                    >
                      {shortLink.replace(/^https?:\/\//, "")}
                    </LinkWithFavicon>

                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            size="icon"
                            variant="ghost"
                            type="button"
                            aria-label="Copy link"
                            className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(shortLink);
                            }}
                          >
                            <CopyIcon weight="duotone" />
                          </Button>
                        }
                      />
                      <TooltipContent side="top">Copy</TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex shrink-0 flex-col items-end leading-tight">
                    <p className="text-sm font-medium tabular-nums">
                      <NumberFlow value={link.clicks} isolate={true} />
                    </p>
                    <p className="text-muted-foreground text-xs">[clicks]</p>
                  </div>

                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <NavLink
                          to={`/link/${slug}`}
                          aria-label="View analytics"
                          className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-accent/50 flex shrink-0 items-center justify-center rounded-md p-2 transition-colors outline-none focus-visible:ring-2"
                        >
                          <NavArrowRight className="size-4" strokeWidth={2} />
                        </NavLink>
                      }
                    />
                    <TooltipContent side="right">View analytics</TooltipContent>
                  </Tooltip>
                </div>

                {/* Secondary line — full URL, aligned under the link */}
                <p
                  className="text-muted-foreground mt-1 truncate pl-10 text-xs"
                  title={link.originalUrl}
                >
                  {link.originalUrl}
                </p>
              </motion.div>
            );
          })
        )}
      </CardContent>

      {!isLoading && displayData.length > 0 && (
        <CardFooter className="justify-end">
          <NavLink
            to="/urls"
            className="text-muted-foreground hover:text-foreground focus-visible:ring-accent/50 inline-flex items-center gap-1 rounded-sm text-xs font-medium transition-colors outline-none focus-visible:ring-2"
          >
            View all links
            <NavArrowRight className="size-3.5" strokeWidth={2} />
          </NavLink>
        </CardFooter>
      )}
    </Card>
  );
}

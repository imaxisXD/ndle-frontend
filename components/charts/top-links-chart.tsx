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
import { makeShortLink } from "@/lib/config";
import { NavLink } from "react-router";
import { NavArrowRight } from "iconoir-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/base-tooltip";
import { LinkWithFavicon } from "@/components/ui/link-with-favicon";
import { CopyIcon, LinkIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCallback } from "react";

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
  const { add } = useToast();

  const handleCopy = useCallback(
    (shortUrl: string) => {
      const normalized = shortUrl.startsWith("http")
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
    <Card className={cn("bg-white", className)}>
      <CardHeader className="flex flex-col items-start gap-1">
        <CardTitle className="flex items-center gap-2 text-base leading-none font-medium tracking-tight text-zinc-900">
          <LinkIcon className="size-5" />
          Top Performing Links
        </CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Most clicked links in the selected period
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <div className="p-6 pt-0">
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          </div>
        ) : displayData.length === 0 ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            No link activity found.
          </div>
        ) : (
          displayData.map((link, index) => {
            const shortLink = makeShortLink(link.url);
            const normalizedHref = shortLink.startsWith("http")
              ? shortLink
              : `https://${shortLink}`;
            const slug = link.url;

            return (
              <div
                key={link.url}
                className="group border-border/70 bg-card flex h-18 items-center gap-4 rounded-sm border px-2"
              >
                <div className="flex items-center justify-start gap-1 text-sm">
                  <span>[{index + 1}]</span>
                </div>
                {/* Favicon + Link Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-start gap-1">
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
                            variant="link"
                            type="button"
                            className="text-muted-foreground hover:bg-muted flex shrink-0 items-center justify-center rounded-md p-1 transition-colors hover:text-blue-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(shortLink);
                            }}
                          >
                            <CopyIcon weight="duotone" strokeWidth={2.5} />
                          </Button>
                        }
                      />
                      <TooltipContent side="top">Copy</TooltipContent>
                    </Tooltip>
                  </div>
                  <p
                    className="text-muted-foreground truncate pl-1 text-xs"
                    title={link.originalUrl}
                  >
                    {link.originalUrl}
                  </p>
                </div>

                {/* Clicks */}
                <div className="flex flex-col items-center justify-center">
                  <p className="text-sm font-medium">
                    <NumberFlow value={link.clicks} isolate={true} />
                  </p>
                  <p className="text-muted-foreground text-xs">[clicks]</p>
                </div>

                {/* View Details Action */}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <NavLink
                        to={`/link/${slug}`}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors"
                      >
                        <NavArrowRight className="size-4" strokeWidth={2} />
                      </NavLink>
                    }
                  />
                  <TooltipContent side="right">View analytics</TooltipContent>
                </Tooltip>
              </div>
            );
          })
        )}
      </CardContent>
      <CardFooter>
        {/* <p className="text-muted-foreground text-xs">
          Clicks are updated every 5 minutes
        </p> */}
      </CardFooter>
    </Card>
  );
}

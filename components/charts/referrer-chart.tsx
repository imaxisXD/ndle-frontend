"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
} from "@/components/ui/base-dialog";
import { Button } from "@/components/ui/button";
import { Expand } from "iconoir-react";

import { cn } from "@/lib/utils";

import {
  LinkSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";

function normalizeReferrerHost(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (trimmed === "direct / none" || trimmed === "direct") return "direct";
  if (trimmed === "other") return "other";

  try {
    const parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`,
    );
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return trimmed.split("/")[0].replace(/^www\./, "");
  }
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

/** Convert domain to friendly display name */
function getFriendlyName(domain: string): string {
  const d = normalizeReferrerHost(domain);

  if (matchesDomain(d, "google.com")) return "Google";
  if (matchesDomain(d, "twitter.com") || d === "t.co") return "Twitter";
  if (d === "x.com") return "X";
  if (matchesDomain(d, "linkedin.com")) return "LinkedIn";
  if (matchesDomain(d, "facebook.com") || d === "fb.com") return "Facebook";
  if (matchesDomain(d, "instagram.com")) return "Instagram";
  if (matchesDomain(d, "youtube.com") || d === "youtu.be") return "YouTube";
  if (matchesDomain(d, "reddit.com")) return "Reddit";
  if (matchesDomain(d, "github.com")) return "GitHub";
  if (matchesDomain(d, "tiktok.com")) return "TikTok";
  if (matchesDomain(d, "pinterest.com")) return "Pinterest";
  if (matchesDomain(d, "medium.com")) return "Medium";
  if (matchesDomain(d, "discord.com") || matchesDomain(d, "discord.gg"))
    return "Discord";
  if (matchesDomain(d, "telegram.org") || d === "t.me") return "Telegram";
  if (matchesDomain(d, "whatsapp.com") || d === "wa.me") return "WhatsApp";
  if (matchesDomain(d, "slack.com")) return "Slack";
  if (d === "direct") return "Direct";
  if (d === "other") return "Other";

  return d;
}

export interface ReferrerData {
  domain: string;
  clicks: number;
}

export function ReferrerChart({
  data,
  isLoading,
  limit = 7,
  className,
}: {
  data?: ReferrerData[];
  isLoading?: boolean;
  limit?: number;
  className?: string;
}) {
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);

    return data
      .slice()
      .sort((a, b) => b.clicks - a.clicks)
      .map((item) => ({
        domain: item.domain,
        clicks: item.clicks,
        percentage:
          totalClicks > 0 ? Math.round((item.clicks / totalClicks) * 100) : 0,
      }));
  }, [data]);

  const chartData = useMemo(() => {
    return sortedData.slice(0, limit);
  }, [sortedData, limit]);

  return (
    <Card
      className={cn(
        "flex h-full flex-col border-zinc-200 bg-white text-zinc-900",
        className,
      )}
    >
      <CardHeader className="border-b border-zinc-200">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 font-medium text-zinc-900">
              <LinkSimpleIcon className="size-5" weight="duotone" />
              Traffic Sources
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Where your clicks are coming from
            </CardDescription>
          </div>
          {sortedData.length > limit && (
            <Dialog>
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-900 hover:bg-zinc-100 hover:text-zinc-900"
                  >
                    <Expand className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent className="flex flex-col gap-5 sm:max-w-2xl">
                <DialogHeader className="bg-transparent">
                  <DialogTitle>All Traffic Sources</DialogTitle>
                </DialogHeader>
                <DialogBody className="rounded-sm bg-white p-2">
                  <div className="max-h-[70vh] overflow-y-auto px-2 py-4">
                    <BklitHorizontalBarChart
                      barWidth={28}
                      data={sortedData}
                      heightClassName="h-auto"
                      labelFormatter={(value) => getFriendlyName(String(value))}
                      labelKey="domain"
                      labelWidth={132}
                      style={{
                        height: `${Math.max(sortedData.length * 40, 200)}px`,
                      }}
                      valueKey="clicks"
                    />
                  </div>
                </DialogBody>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="grow p-6">
        <BklitHorizontalBarChart
          barWidth={28}
          data={chartData}
          emptyDescription="No referrer data available."
          emptyTitle="No referrer data"
          heightClassName="h-[280px]"
          isLoading={isLoading}
          labelFormatter={(value) => getFriendlyName(String(value))}
          labelKey="domain"
          labelWidth={132}
          valueKey="clicks"
        />
      </CardContent>
      {!isLoading && chartData.length > 0 && (
        <CardFooter className="flex-col items-start gap-2 border-t border-zinc-200 pt-4 text-sm">
          <div className="flex w-full items-center justify-between text-xs text-zinc-500">
            <span>Total sources</span>
            <span className="font-medium text-zinc-900">
              [{sortedData.length}]
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

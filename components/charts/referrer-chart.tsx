"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  LabelList,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowSquareOutIcon,
  DiscordLogoIcon,
  FacebookLogoIcon,
  GithubLogoIcon,
  GlobeIcon,
  GoogleLogoIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
  LinkSimpleIcon,
  MediumLogoIcon,
  PinterestLogoIcon,
  RedditLogoIcon,
  SlackLogoIcon,
  TelegramLogoIcon,
  TiktokLogoIcon,
  WhatsappLogoIcon,
  XLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

/** Map domain patterns to Phosphor icons */
function getReferrerIcon(domain: string) {
  const d = domain.toLowerCase();

  if (d.includes("google")) return GoogleLogoIcon;
  if (d.includes("twitter") || d === "t.co" || d.includes("x.com"))
    return XLogoIcon;
  if (d.includes("linkedin")) return LinkedinLogoIcon;
  if (d.includes("facebook") || d.includes("fb.com")) return FacebookLogoIcon;
  if (d.includes("instagram")) return InstagramLogoIcon;
  if (d.includes("youtube") || d.includes("youtu.be")) return YoutubeLogoIcon;
  if (d.includes("reddit")) return RedditLogoIcon;
  if (d.includes("github")) return GithubLogoIcon;
  if (d.includes("tiktok")) return TiktokLogoIcon;
  if (d.includes("pinterest")) return PinterestLogoIcon;
  if (d.includes("medium.com")) return MediumLogoIcon;
  if (d.includes("discord")) return DiscordLogoIcon;
  if (d.includes("telegram") || d === "t.me") return TelegramLogoIcon;
  if (d.includes("whatsapp") || d === "wa.me") return WhatsappLogoIcon;
  if (d.includes("slack")) return SlackLogoIcon;
  if (d === "direct / none" || d === "direct") return ArrowSquareOutIcon;

  return GlobeIcon;
}

/** Convert domain to friendly display name */
function getFriendlyName(domain: string): string {
  const d = domain.toLowerCase();

  if (d.includes("google")) return "Google";
  if (d.includes("twitter") || d === "t.co") return "Twitter";
  if (d.includes("x.com")) return "X";
  if (d.includes("linkedin")) return "LinkedIn";
  if (d.includes("facebook") || d.includes("fb.com")) return "Facebook";
  if (d.includes("instagram")) return "Instagram";
  if (d.includes("youtube") || d.includes("youtu.be")) return "YouTube";
  if (d.includes("reddit")) return "Reddit";
  if (d.includes("github")) return "GitHub";
  if (d.includes("tiktok")) return "TikTok";
  if (d.includes("pinterest")) return "Pinterest";
  if (d.includes("medium.com")) return "Medium";
  if (d.includes("discord")) return "Discord";
  if (d.includes("telegram") || d === "t.me") return "Telegram";
  if (d.includes("whatsapp") || d === "wa.me") return "WhatsApp";
  if (d.includes("slack")) return "Slack";
  if (d === "direct / none") return "Direct";
  if (d === "other") return "Other";

  // Return domain as-is for unknown sources
  return domain;
}

// Custom label component to render icon + referrer name inside the bar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReferrerLabel(props: any) {
  const { x = 0, y = 0, height = 0, value = "" } = props;
  const IconComponent = getReferrerIcon(String(value));
  const friendlyName = getFriendlyName(String(value));

  return (
    <foreignObject
      x={Number(x) + 8}
      y={Number(y)}
      width={160}
      height={Number(height)}
    >
      <div className="flex h-full items-center gap-2">
        <IconComponent
          className="size-4 shrink-0 text-zinc-600"
          weight="duotone"
        />
        <span className="truncate text-xs font-medium text-black">
          {friendlyName}
        </span>
      </div>
    </foreignObject>
  );
}

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--color-black)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

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
                    <ChartContainer
                      config={chartConfig}
                      className="aspect-auto w-full"
                      style={{
                        height: `${Math.max(sortedData.length * 40, 200)}px`,
                      }}
                    >
                      <BarChart
                        data={sortedData}
                        layout="vertical"
                        margin={{
                          right: 48,
                          left: 8,
                        }}
                        barCategoryGap="20%"
                      >
                        <defs>
                          <linearGradient
                            id="barGradientHorizontalRefererDialog"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop
                              offset="0%"
                              stopColor="#06b6d4"
                              stopOpacity={0.7}
                            />
                            <stop
                              offset="100%"
                              stopColor="#0891b2"
                              stopOpacity={1}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          horizontal={false}
                          strokeDasharray="5"
                          stroke="var(--border)"
                          strokeOpacity={1}
                        />
                        <YAxis
                          dataKey="domain"
                          type="category"
                          tickLine={false}
                          tickMargin={10}
                          axisLine={false}
                          hide
                        />
                        <XAxis
                          dataKey="clicks"
                          type="number"
                          hide
                          domain={[0, "dataMax"]}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              className="rounded-sm bg-linear-to-br from-black/80 to-black text-white *:text-inherit **:text-inherit"
                              labelClassName="text-white font-medium"
                              labelFormatter={(value) =>
                                getFriendlyName(String(value))
                              }
                              indicator="dot"
                              color="var(--accent)"
                            />
                          }
                        />
                        <Bar
                          dataKey="clicks"
                          layout="vertical"
                          fill="url(#barGradientHorizontalRefererDialog)"
                          radius={4}
                          barSize={28}
                          minPointSize={160}
                        >
                          <LabelList
                            dataKey="domain"
                            position="insideLeft"
                            content={ReferrerLabel}
                          />
                          <LabelList
                            dataKey="clicks"
                            position="right"
                            offset={16}
                            className="fill-primary font-medium"
                            fontSize={12}
                          />
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                </DialogBody>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="grow p-6">
        {isLoading ? (
          <div className="flex h-[280px] flex-col justify-between">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-7 w-full rounded" />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            No referrer data available.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: "280px" }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{
                right: 48,
                left: 8,
              }}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient
                  id="barGradientHorizontalReferer"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#0891b2" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal={false}
                strokeDasharray="5"
                stroke="var(--border)"
                strokeOpacity={1}
              />
              <YAxis
                dataKey="domain"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                hide
              />
              <XAxis
                dataKey="clicks"
                type="number"
                hide
                domain={[0, "dataMax"]}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="rounded-sm bg-linear-to-br from-black/80 to-black text-white *:text-inherit **:text-inherit"
                    labelClassName="text-white font-medium"
                    labelFormatter={(value) => getFriendlyName(String(value))}
                    indicator="dot"
                    color="var(--accent)"
                  />
                }
              />
              <Bar
                dataKey="clicks"
                layout="vertical"
                fill="url(#barGradientHorizontalReferer)"
                radius={4}
                barSize={28}
                minPointSize={160}
              >
                <LabelList
                  dataKey="domain"
                  position="insideLeft"
                  content={ReferrerLabel}
                />
                <LabelList
                  dataKey="clicks"
                  position="right"
                  offset={16}
                  className="fill-primary font-medium"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
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

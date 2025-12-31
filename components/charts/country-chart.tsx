"use client";

import { useMemo } from "react";
import Image from "next/image";
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

import { cn, countryCodeToName } from "@/lib/utils";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react";

function getFlagUrl(countryCode: string): string | null {
  const code = (countryCode || "").slice(0, 2).toLowerCase();
  const showFlag = /^[a-z]{2}$/.test(code) && code !== "ot" && code !== "un";
  if (!showFlag) return null;
  // Use Cloudflare Worker for edge caching, fallback to local API
  const baseUrl = process.env.NEXT_PUBLIC_FILE_PROXY_URL || "";
  const apiPath = baseUrl ? `${baseUrl}/flag` : "/api/flag";
  return `${apiPath}?code=${code}`;
}

// Custom label component to render flag + country name inside the bar
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CountryLabel(props: any) {
  const { x = 0, y = 0, height = 0, value = "" } = props;
  const flagUrl = getFlagUrl(String(value));

  return (
    <foreignObject
      x={Number(x) + 8}
      y={Number(y)}
      width={160}
      height={Number(height)}
    >
      <div className="flex h-full items-center gap-2">
        {flagUrl ? (
          <Image
            src={flagUrl}
            alt={String(value)}
            width={16}
            height={16}
            className="size-4 shrink-0"
            unoptimized
          />
        ) : (
          <GlobeHemisphereWestIcon className="text-muted-foreground size-4" />
        )}
        <span className="truncate text-xs font-medium text-black">
          {countryCodeToName(String(value))}
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

export function CountryChart({
  data,
  isLoading,
  limit = 7,
  className,
}: {
  data?: Array<{ country: string; clicks: number }>;
  isLoading?: boolean;
  limit?: number;
  className?: string;
}) {
  const topCountries = useMemo(() => {
    if (!data || data.length === 0) return [];

    const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);

    return data
      .slice()
      .sort((a, b) => b.clicks - a.clicks)
      .map((item) => ({
        country: item.country,
        clicks: item.clicks,
        percentage:
          totalClicks > 0 ? Math.round((item.clicks / totalClicks) * 100) : 0,
      }));
  }, [data]);

  const chartData = useMemo(() => {
    return topCountries.slice(0, limit);
  }, [topCountries, limit]);

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
              <GlobeHemisphereWestIcon className="size-5" weight="duotone" />
              Top Countries
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Clicks by geographic location
            </CardDescription>
          </div>
          {topCountries.length > limit && (
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
                  <DialogTitle>All Countries</DialogTitle>
                </DialogHeader>
                <DialogBody className="rounded-sm bg-white p-2">
                  <div className="max-h-[70vh] overflow-y-auto px-2 py-4">
                    <ChartContainer
                      config={chartConfig}
                      className="aspect-auto w-full"
                      style={{
                        height: `${Math.max(topCountries.length * 40, 200)}px`,
                      }}
                    >
                      <BarChart
                        accessibilityLayer
                        data={topCountries}
                        layout="vertical"
                        margin={{
                          right: 48,
                          left: 8,
                        }}
                        barCategoryGap="20%"
                      >
                        <defs>
                          <linearGradient
                            id="barGradientHorizontalCountryDialog"
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="0"
                          >
                            <stop
                              offset="0%"
                              stopColor="#ffcc00ff"
                              stopOpacity={0.7}
                            />
                            <stop
                              offset="100%"
                              stopColor="#ffc700"
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
                          dataKey="country"
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
                                countryCodeToName(String(value))
                              }
                              indicator="dot"
                              color="var(--accent)"
                            />
                          }
                        />
                        <Bar
                          dataKey="clicks"
                          layout="vertical"
                          fill="url(#barGradientHorizontalCountryDialog)"
                          radius={4}
                          barSize={28}
                          minPointSize={160}
                        >
                          <LabelList
                            dataKey="country"
                            position="insideLeft"
                            content={CountryLabel}
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
            No location data available.
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto w-full"
            style={{ height: "280px" }}
          >
            <BarChart
              accessibilityLayer
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
                  id="barGradientHorizontalCountry"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#ffcc00ff" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#ffc700" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal={false}
                strokeDasharray="5"
                stroke="var(--border)"
                strokeOpacity={1}
              />
              <YAxis
                dataKey="country"
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
                    labelFormatter={(value) => countryCodeToName(String(value))}
                    indicator="dot"
                    color="var(--accent)"
                  />
                }
              />
              <Bar
                dataKey="clicks"
                layout="vertical"
                fill="url(#barGradientHorizontalCountry)"
                radius={4}
                barSize={28}
                minPointSize={160}
              >
                <LabelList
                  dataKey="country"
                  position="insideLeft"
                  content={CountryLabel}
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
            <span>Total countries</span>
            <span className="font-medium text-zinc-900">
              [{topCountries.length}]
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

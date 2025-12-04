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
import { Expand, Globe } from "iconoir-react";
import { ProgressListItem } from "@/components/analytics/ProgressListItem";
import { cn } from "@/lib/utils";

function getCountryFlag(countryCode: string) {
  const code = (countryCode || "").slice(0, 2).toLowerCase();
  const showFlag = /^[a-z]{2}$/.test(code) && code !== "ot" && code !== "un";

  if (!showFlag) return <Globe className="text-muted-foreground size-4" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={countryCode}
      src={`/api/flag?code=${code}`}
      className="size-4 shrink-0"
    />
  );
}

function getFlagUrl(countryCode: string): string | null {
  const code = (countryCode || "").slice(0, 2).toLowerCase();
  const showFlag = /^[a-z]{2}$/.test(code) && code !== "ot" && code !== "un";
  return showFlag ? `/api/flag?code=${code}` : null;
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
      width={120}
      height={Number(height)}
    >
      <div className="flex h-full items-center gap-2">
        {flagUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flagUrl} alt={String(value)} className="size-4 shrink-0" />
        ) : (
          <Globe className="text-muted-foreground size-4" />
        )}
        <span className="text-xs text-white">{String(value)}</span>
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
    <Card className={cn("flex h-full flex-col", className)}>
      <CardHeader className="border-b">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="flex items-center gap-2 font-medium">
              <Globe className="size-5" />
              Top Countries
            </CardTitle>
            <CardDescription className="text-xs">
              Clicks by geographic location
            </CardDescription>
          </div>
          {topCountries.length > limit && (
            <Dialog>
              <DialogTrigger
                render={
                  <Button variant="ghost" size="icon">
                    <Expand className="h-4 w-4" />
                  </Button>
                }
              />
              <DialogContent className="flex flex-col gap-5 sm:max-w-md">
                <DialogHeader className="bg-transparent">
                  <DialogTitle>All Countries</DialogTitle>
                </DialogHeader>
                <DialogBody className="rounded-sm bg-white p-2">
                  <div className="max-h-[50vh] space-y-3.5 overflow-y-auto px-2 py-4">
                    {topCountries.map((country) => (
                      <ProgressListItem
                        key={country.country}
                        label={
                          <div
                            className="flex items-center gap-2"
                            title={country.country}
                          >
                            {getCountryFlag(country.country)}
                            <span className="text-muted-foreground text-xs">
                              {country.country}
                            </span>
                          </div>
                        }
                        value={country.clicks}
                        percentage={country.percentage}
                      />
                    ))}
                  </div>
                </DialogBody>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="grow p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
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
            style={{ height: `${Math.max(chartData.length * 40, 80)}px` }}
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
                  <stop
                    offset="0%"
                    stopColor="var(--color-pink-400)"
                    stopOpacity={0.6}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-pink-400) "
                    stopOpacity={1}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="country"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                hide
              />
              <XAxis dataKey="clicks" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar
                dataKey="clicks"
                layout="vertical"
                fill="url(#barGradientHorizontalCountry)"
                radius={4}
                barSize={24}
              >
                <LabelList
                  dataKey="country"
                  position="insideLeft"
                  content={CountryLabel}
                />
                <LabelList
                  dataKey="clicks"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      {!isLoading && chartData.length > 0 && (
        <CardFooter className="flex-col items-start gap-2 border-t pt-4 text-sm">
          <div className="text-muted-foreground flex w-full items-center justify-between text-xs">
            <span>Total countries</span>
            <span className="text-foreground font-medium">
              {topCountries.length}
            </span>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

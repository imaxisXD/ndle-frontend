"use client";

import * as React from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Globe } from "iconoir-react";
import { cn, countryCodeToName } from "@/lib/utils";
import { CircleGridLoaderIcon } from "@/components/icons";

export const description =
  "A bar chart showing country-wise click distribution";

const chartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--color-blue-600)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function CountryChart({
  data,
  limit = 6,
  isLoading,
  className,
}: {
  data?: Array<{ country: string; clicks: number }>;
  limit?: number;
  isLoading?: boolean;
  className?: string;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const dataset = (data ?? []).map((d) => ({
    ...d,
    countryFull: countryCodeToName(d.country),
  }));
  const totalClicks = dataset.reduce(
    (sum: number, row) => sum + (row.clicks || 0),
    0,
  );
  const showEmptyState = !isLoading && Array.isArray(data) && data.length === 0;

  const sorted = [...dataset].sort((a, b) => b.clicks - a.clicks);
  const top = sorted.slice(0, limit);

  const topSum = top.reduce((s, r) => s + r.clicks, 0);
  const otherClicks = Math.max(totalClicks - topSum, 0);
  const visible = showAll
    ? sorted
    : otherClicks > 0
      ? [
          ...top,
          {
            country: "OTHER",
            countryFull: "Other",
            countryFlag: "",
            clicks: otherClicks,
          },
        ]
      : top;
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <Globe className="size-5" />
          Country Distribution
        </CardTitle>
        <CardDescription className="text-xs">
          Click distribution by country
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
            isLoading={isLoading}
            showEmptyState={showEmptyState}
            loadingContent={
              <CircleGridLoaderIcon
                title="Loading analytics"
                className="text-primary"
              />
            }
            emptyStateContent={
              <div className="text-center">
                <p className="text-foreground font-medium">No analytics yet</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  This link hasn’t received any clicks in the selected range.
                </p>
              </div>
            }
          >
            <BarChart accessibilityLayer data={visible} layout="vertical">
              <defs>
                <linearGradient
                  id="barGradientHorizontalCountry"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="80%" stopColor="var(--color-sky-400)" />
                  <stop offset="100%" stopColor="var(--color-sky-300)" />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="countryFull"
                type="category"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                hide
              />
              <XAxis dataKey="clicks" type="number" hide />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className="bg-white/90 backdrop-blur-lg"
                    indicator="dashed"
                    color="#8FD4FF"
                    labelFormatter={(label, payload) => {
                      const row = payload?.[0]?.payload as
                        | {
                            country: string;
                            countryFull: string;
                            clicks: number;
                          }
                        | undefined;
                      const percentage =
                        row && totalClicks
                          ? ((row.clicks / totalClicks) * 100).toFixed(1)
                          : "0.0";
                      return `${row?.countryFull ?? label} [${percentage}%]`;
                    }}
                  />
                }
              />
              <Bar
                dataKey="clicks"
                layout="vertical"
                fill="url(#barGradientHorizontalCountry)"
                radius={6}
                barSize={24}
              >
                <LabelList
                  dataKey="countryFull"
                  position="insideLeft"
                  offset={8}
                  className="fill-(--color-label)"
                  fontSize={12}
                  content={(props) => {
                    const { x, y, value, index, height } = props as unknown as {
                      x: number;
                      y: number;
                      value: string;
                      index: number;
                      height: number;
                    };
                    const row = visible[index] as unknown as
                      | {
                          country: string;
                          countryFull: string;
                        }
                      | undefined;
                    const code = (row?.country || "").slice(0, 2).toLowerCase();
                    const showFlag = /^[a-z]{2}$/.test(code) && code !== "ot";
                    const src = `/api/flag?code=${code}`;
                    // Center vertically within the bar and position horizontally inside
                    const flagY = y + height / 2 - 6; // -6 to center a 12px flag
                    const textY = y + height / 2 + 5; // +5 to position text below flag
                    return (
                      <g>
                        {showFlag ? (
                          <foreignObject
                            x={x + 4}
                            y={flagY}
                            width={12}
                            height={12}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt={row?.country || String(value)}
                              src={src}
                              className="size-3 shrink-0"
                            />
                          </foreignObject>
                        ) : null}
                        <text
                          x={x + (showFlag ? 20 : 8)}
                          y={textY}
                          className="fill-(--color-label)"
                          fontSize={12}
                        >
                          {value}
                        </text>
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show top" : `Show all`}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

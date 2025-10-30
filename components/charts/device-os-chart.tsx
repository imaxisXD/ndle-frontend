"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/base-tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AppleImac2021 as Monitor,
  Laptop as DeviceDesktop,
} from "iconoir-react";
import { CircleGridLoaderIcon } from "@/components/icons";

// Device Chart Data
const defaultDeviceData = [
  { device: "Desktop", clicks: 18 },
  { device: "Mobile", clicks: 5 },
];

// OS Chart Data
const defaultOsData = [{ os: "macOS", clicks: 23 }];

const deviceConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-4)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const osConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-7)",
  },
  label: {
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function DeviceOSChart({
  deviceData,
  osData,
  isLoading,
}: {
  deviceData?: Array<{ device: string; clicks: number }>;
  osData?: Array<{ os: string; clicks: number }>;
  isLoading?: boolean;
}) {
  const showDeviceEmpty =
    !isLoading && Array.isArray(deviceData) && deviceData.length === 0;
  const showOsEmpty =
    !isLoading && Array.isArray(osData) && osData.length === 0;
  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-1.5">
        <CardTitle className="flex items-center gap-2 font-medium">
          <DeviceDesktop className="size-5" />
          Device & Operating System
        </CardTitle>
        <CardDescription className="text-xs">
          Device types and operating system distribution
        </CardDescription>
      </CardHeader>
      <CardToolbar>
        <Tabs defaultValue="device" className="w-full">
          <TabsList
            className="grid w-full grid-cols-2"
            size="xs"
            variant="line"
          >
            <TabsTrigger value="device" className="flex items-center gap-2">
              <DeviceDesktop className="size-4" />
              Device Types
            </TabsTrigger>
            <TabsTrigger value="os" className="flex items-center gap-2">
              <Monitor className="size-4" />
              Operating Systems
            </TabsTrigger>
          </TabsList>
          <TabsContent value="device" className="mt-0">
            <CardContent className="pt-4">
              <ChartContainer
                config={deviceConfig}
                className="aspect-auto h-[200px] w-full"
                isLoading={isLoading}
                showEmptyState={showDeviceEmpty}
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
                <BarChart
                  accessibilityLayer
                  data={deviceData ?? defaultDeviceData}
                  layout="vertical"
                  margin={{ right: 16 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradientHorizontalDevice"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#b5e48c" />
                      <stop offset="100%" stopColor="#99d98c" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="device"
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
                        color="var(--color-orange-600)"
                        labelFormatter={(label, payload) => {
                          const row = payload?.[0]?.payload as
                            | { device: string; clicks: number }
                            | undefined;
                          const dataset = deviceData ?? defaultDeviceData;
                          const totalClicks = dataset.reduce(
                            (sum, item) => sum + item.clicks,
                            0,
                          );
                          const percentage =
                            row && totalClicks
                              ? ((row.clicks / totalClicks) * 100).toFixed(1)
                              : "0.0";
                          return `${label} [${percentage}%]`;
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="clicks"
                    layout="vertical"
                    fill="url(#barGradientHorizontalDevice)"
                    radius={4}
                    maxBarSize={20}
                  >
                    <LabelList
                      dataKey="device"
                      position="insideLeft"
                      offset={8}
                      className="fill-(--color-label)"
                      fontSize={12}
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
            </CardContent>
          </TabsContent>
          <TabsContent value="os" className="mt-0">
            <CardContent className="pt-4">
              <ChartContainer
                config={osConfig}
                className="aspect-auto h-[200px] w-full"
                isLoading={isLoading}
                showEmptyState={showOsEmpty}
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
                <BarChart
                  accessibilityLayer
                  data={osData ?? defaultOsData}
                  layout="vertical"
                  margin={{ right: 16 }}
                >
                  <defs>
                    <linearGradient
                      id="barGradientHorizontalOS"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#ffc8dd" />
                      <stop offset="100%" stopColor="#ffafcc" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid horizontal={false} />
                  <YAxis
                    dataKey="os"
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
                        color="#4f46e5"
                        labelFormatter={(label, payload) => {
                          const row = payload?.[0]?.payload as
                            | { os: string; clicks: number }
                            | undefined;
                          const dataset = osData ?? defaultOsData;
                          const totalClicks = dataset.reduce(
                            (sum, item) => sum + item.clicks,
                            0,
                          );
                          const percentage =
                            row && totalClicks
                              ? ((row.clicks / totalClicks) * 100).toFixed(1)
                              : "0.0";
                          return `${label} [${percentage}%]`;
                        }}
                      />
                    }
                  />
                  <Bar
                    dataKey="clicks"
                    layout="vertical"
                    fill="url(#barGradientHorizontalOS)"
                    radius={4}
                    maxBarSize={20}
                  >
                    <LabelList
                      dataKey="os"
                      position="insideLeft"
                      offset={8}
                      className="fill-(--color-label)"
                      fontSize={12}
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
            </CardContent>
          </TabsContent>
        </Tabs>
      </CardToolbar>
    </Card>
  );
}

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

// Device Chart Data
const deviceData = [
  { device: "Desktop", clicks: 18 },
  { device: "Mobile", clicks: 5 },
];

// OS Chart Data
const osData = [{ os: "macOS", clicks: 23 }];

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

export function DeviceOSChart() {
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
              >
                <BarChart
                  accessibilityLayer
                  data={deviceData}
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
                      <stop offset="0%" stopColor="var(--color-orange-300)" />
                      <stop offset="100%" stopColor="var(--color-orange-500)" />
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
                          const data = payload[0]?.payload;
                          const totalClicks = deviceData.reduce(
                            (sum, item) => sum + item.clicks,
                            0,
                          );
                          const percentage = (
                            (data.clicks / totalClicks) *
                            100
                          ).toFixed(1);
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
              >
                <BarChart
                  accessibilityLayer
                  data={osData}
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
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4f46e5" />
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
                          const data = payload[0]?.payload;
                          const totalClicks = osData.reduce(
                            (sum, item) => sum + item.clicks,
                            0,
                          );
                          const percentage = (
                            (data.clicks / totalClicks) *
                            100
                          ).toFixed(1);
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

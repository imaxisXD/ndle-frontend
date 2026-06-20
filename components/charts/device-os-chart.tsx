"use client";

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
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import {
  AppleImac2021 as Monitor,
  Laptop as DeviceDesktop,
} from "iconoir-react";

// Device Chart Data
const defaultDeviceData = [
  { device: "Desktop", clicks: 18 },
  { device: "Mobile", clicks: 5 },
];

// OS Chart Data
const defaultOsData = [{ os: "macOS", clicks: 23 }];

export function DeviceOSChart({
  deviceData,
  osData,
  isLoading,
}: {
  deviceData?: Array<{ device: string; clicks: number }>;
  osData?: Array<{ os: string; clicks: number }>;
  isLoading?: boolean;
}) {
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
              <BklitHorizontalBarChart
                data={deviceData ?? defaultDeviceData}
                heightClassName="h-[200px]"
                isLoading={isLoading}
                labelKey="device"
                valueKey="clicks"
              />
            </CardContent>
          </TabsContent>
          <TabsContent value="os" className="mt-0">
            <CardContent className="pt-4">
              <BklitHorizontalBarChart
                data={osData ?? defaultOsData}
                heightClassName="h-[200px]"
                isLoading={isLoading}
                labelKey="os"
                valueKey="clicks"
              />
            </CardContent>
          </TabsContent>
        </Tabs>
      </CardToolbar>
    </Card>
  );
}

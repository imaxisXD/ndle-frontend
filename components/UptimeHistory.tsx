"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { PulseIcon } from "@phosphor-icons/react";
import { getUptimeBarColor } from "@/lib/utils";

interface UptimeHistoryProps {
  uptimeBars: string[];
}

export function UptimeHistory({ uptimeBars }: UptimeHistoryProps) {
  return (
    <Card>
      <CardHeader className="py-6">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <PulseIcon className="size-5 fill-emerald-500" weight="duotone" />
          Uptime History
        </CardTitle>
        <CardDescription className="text-sm">
          Each bar represents one day of monitoring
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1">
          {uptimeBars.map((status, index) => (
            <div
              key={index}
              className={`h-10 w-full rounded-xs ${getUptimeBarColor(status)} border border-black/20 transition-all hover:opacity-80`}
              title={`Day ${index + 1}: ${status === "future" ? "upcoming" : status}`}
            />
          ))}
        </div>
        <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
          <span>[Day 1]</span>
          <span>[Day 30]</span>
        </div>
      </CardContent>
      <CardFooter className="text-muted-foreground flex items-center justify-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="size-3 bg-green-500" />
          <span className="text-xs">Healthy</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 bg-yellow-500" />
          <span className="text-xs">Warning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 bg-red-500" />
          <span className="text-xs">Error</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-3 border border-dashed border-gray-400 bg-gray-300" />
          <span className="text-xs">No data</span>
        </div>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Clock, CheckCircle } from "iconoir-react";
import { Id } from "@/convex/_generated/dataModel";
import {
  LightningIcon,
  ShieldCheckIcon,
  ShieldPlusIcon,
  ShieldSlashIcon,
  ShieldWarningIcon,
  SirenIcon,
} from "@phosphor-icons/react";
import { UptimeHistory } from "./UptimeHistory";
import {
  formatRelativeTimeCompact,
  mapHealthStatusToUI,
  getResponseTimeColor,
  getUptimeColor,
} from "@/lib/utils";
import type { UIStatus } from "@/lib/utils";

interface LinkHealthPanelProps {
  urlId: Id<"urls"> | undefined;
}

export function LinkHealthPanel({ urlId }: LinkHealthPanelProps) {
  const healthData = useQuery(
    api.linkHealth.getHealthandIncidentsDataForUrl,
    urlId ? { urlId } : "skip",
  );

  // Loading when urlId exists but query hasn't returned yet
  const isLoading = urlId && healthData === undefined;

  // Calculate uptime from dailySummaries
  const calculateUptime = () => {
    if (!healthData?.dailySummaries || healthData.dailySummaries.length === 0) {
      return 100; // Default to 100% if no data
    }
    const summaries = healthData.dailySummaries;
    const total = summaries.reduce((s, r) => s + r.totalChecks, 0);
    const healthy = summaries.reduce((s, r) => s + r.healthyChecks, 0);
    return total > 0 ? Math.round((healthy / total) * 1000) / 10 : 100;
  };

  const uptime = calculateUptime();

  // Get the monitoring start date (when first health check was recorded)
  const getMonitoringStartDate = () => {
    if (!healthData?.healthData?._creationTime) return new Date();
    return new Date(healthData.healthData._creationTime);
  };

  const getUptimeBars = () => {
    const startDate = getMonitoringStartDate();
    const summaries = healthData?.dailySummaries || [];
    const bars: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Generate 30 days starting from monitoring start date
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const dateStr = date.toISOString().split("T")[0];

      // If this day is in the future, mark as unknown
      if (date > today) {
        bars.push("future");
      } else {
        const summary = summaries.find((s) => s.date === dateStr);

        if (!summary) {
          bars.push("unknown");
        } else {
          const uptimePercent =
            summary.totalChecks > 0
              ? (summary.healthyChecks / summary.totalChecks) * 100
              : 100;
          if (uptimePercent >= 99) {
            bars.push("healthy");
          } else if (uptimePercent >= 90) {
            bars.push("warning");
          } else {
            bars.push("error");
          }
        }
      }
    }

    return bars;
  };

  const getStatusIcon = (status: UIStatus) => {
    switch (status) {
      case "healthy":
        return (
          <ShieldPlusIcon className="size-5 text-green-600" weight="duotone" />
        );
      case "warning":
        return (
          <ShieldWarningIcon
            className="size-5 text-yellow-600"
            weight="duotone"
          />
        );
      case "error":
        return (
          <ShieldSlashIcon className="size-5 text-red-600" weight="duotone" />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Status Overview Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="size-6 rounded-full" />
                <div>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-1 h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-muted/30 rounded-lg border p-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="mt-2 h-8 w-24" />
                  <Skeleton className="mt-1 h-3 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Uptime History Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-1 h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-sm" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Incident History Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1 h-4 w-48" />
          </CardHeader>
          <CardContent className="p-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <Skeleton className="size-4 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="mt-1 h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // No health data found for this link
  if (!healthData || !healthData.healthData) {
    return (
      <Card className="p-12 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="bg-muted rounded-full p-4">
            <ShieldCheck className="text-muted-foreground h-8 w-8" />
          </div>
          <h3 className="mt-4 text-lg font-medium">No health data yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Health monitoring data for this link will appear here once checks
            begin running automatically.
          </p>
        </div>
      </Card>
    );
  }

  const status = mapHealthStatusToUI(healthData.healthData.healthStatus);
  const uptimeBars = getUptimeBars();

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card variant={"accent"} className="border-border border px-2 py-2">
        <CardHeader className="py-6">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            {getStatusIcon(status)}
            Link Health Status
          </CardTitle>
          <CardDescription className="mt-0.5">
            Real-time monitoring for this link
          </CardDescription>
        </CardHeader>
        <CardContent className="rounded-sm [&:last-child]:rounded-b-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-muted/30 border-border rounded-sm border p-3">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-xs">Uptime</span>
              </div>
              <p
                className={`mt-2 text-2xl font-medium ${getUptimeColor(uptime)}`}
              >
                [{uptime}%]
              </p>
              <p className="text-muted-foreground mt-1 text-xs">Last 30 days</p>
            </div>

            <div className="bg-muted/30 border-border rounded-sm border p-3">
              <div className="flex items-center gap-2">
                <LightningIcon className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-xs">
                  Response Time
                </span>
              </div>
              <p
                className={`mt-2 text-2xl font-medium ${getResponseTimeColor(healthData.healthData.latencyMs)}`}
              >
                [
                {healthData.healthData.latencyMs > 0
                  ? `${healthData.healthData.latencyMs}ms`
                  : "N/A"}
                ]
              </p>
              <p className="text-muted-foreground mt-1 text-xs">Latest check</p>
            </div>

            <div className="bg-muted/30 border-border rounded-sm border p-3">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-xs">
                  Last Checked
                </span>
              </div>
              <p className="mt-2 text-lg font-medium">
                [{formatRelativeTimeCompact(healthData.healthData.checkedAt)}]
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {healthData.incidentData?.length ?? 0} incidents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uptime History */}
      <UptimeHistory uptimeBars={uptimeBars} />

      {/* Incident History */}
      <Card>
        <CardHeader className="py-6">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <SirenIcon className="size-4 fill-red-500" weight="duotone" />
            Incident History
          </CardTitle>
          <CardDescription className="text-sm">
            Recent alerts and resolved issues
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 py-1">
          {healthData.incidentData?.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CheckCircle className="mx-auto size-8 text-green-600" />
              <p className="text-muted-foreground mt-2 text-sm">
                No incidents recorded for this link
              </p>
            </div>
          ) : (
            <div className="divide-border divide-y">
              {healthData.incidentData?.map((incident) => (
                <div
                  key={incident._id}
                  className="hover:bg-muted/30 flex items-center gap-3 px-5 py-3 transition-colors"
                >
                  <div className="w-24">
                    <Badge
                      variant={
                        incident.type === "resolved"
                          ? "green"
                          : incident.type === "warning"
                            ? "yellow"
                            : "red"
                      }
                      className="shrink-0 text-xs"
                    >
                      {incident.type.charAt(0).toUpperCase() +
                        incident.type.slice(1)}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm">{incident.message}</p>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      [{formatRelativeTimeCompact(incident.createdAt)}]
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-muted-foreground flex items-center justify-center text-xs">
          Total Incidents: [{healthData.incidentData?.length}]
        </CardFooter>
      </Card>
    </div>
  );
}

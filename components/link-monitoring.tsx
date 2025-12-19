"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@ui/badge";
import { Card, CardContent } from "@ui/card";
import { RecentIncidents } from "./recent-incidents";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import {
  CheckCircle,
  ShieldCheck,
  WarningCircle,
  XmarkCircle,
  Refresh,
} from "iconoir-react";
import { getShortDomain } from "@/lib/config";
import { cn } from "@/lib/utils";
import { LinkWithFavicon } from "./ui/link-with-favicon";

type HealthStatus = "up" | "down" | "degraded";
type UIStatus = "healthy" | "warning" | "error";

function mapHealthStatusToUI(status: HealthStatus): UIStatus {
  switch (status) {
    case "up":
      return "healthy";
    case "degraded":
      return "warning";
    case "down":
      return "error";
  }
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const shortDomain = getShortDomain();

export function LinkMonitoring() {
  // const [filter, setFilter] = useState<"all" | "healthy" | "warning" | "error">(
  //   "all",
  // );

  const healthData = useQuery(api.linkHealth.getHealthChecksWithStats);
  const recentIncidents = useQuery(api.linkHealth.getRecentIncidents, {
    limit: 10,
  });

  const isLoading = healthData === undefined;

  // Map health data to UI format
  const links = (healthData ?? []).map((check) => ({
    id: check._id,
    shortUrl: `https://${shortDomain}/${check.shortUrl}`,
    originalUrl: check.longUrl,
    status: mapHealthStatusToUI(check.healthStatus),
    uptime: check.uptime,
    responseTime: check.latencyMs,
    lastChecked: formatRelativeTime(check.checkedAt),
    incidents: check.incidents,
    dailySummaries: check.dailySummaries || [],
  }));

  // const filteredLinks = links.filter((link) => {
  //   if (filter === "all") return true;
  //   return link.status === filter;
  // });

  const getResponseTimeColor = (time: number) => {
    if (time === 0) return "text-red-600";
    if (time < 500) return "text-emerald-600";
    if (time < 1000) return "text-amber-600";
    return "text-red-600";
  };

  const healthyCount = links.filter((l) => l.status === "healthy").length;
  const warningCount = links.filter((l) => l.status === "warning").length;
  const errorCount = links.filter((l) => l.status === "error").length;
  const avgUptime =
    links.length > 0
      ? (links.reduce((sum, l) => sum + l.uptime, 0) / links.length).toFixed(1)
      : "100.0";

  // Map incidents for RecentIncidents component
  const incidents = (recentIncidents ?? []).map((inc) => ({
    id: inc._id,
    link: inc.shortUrl,
    type: inc.type,
    message: inc.message,
    time: formatRelativeTime(inc.createdAt),
  }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>

        {/* Link cards skeleton */}
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border-border rounded-lg border bg-white p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                {/* Badge + Link info skeleton */}
                <div className="flex flex-1 items-start">
                  <div className="flex items-center gap-10">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <div className="flex flex-col space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                </div>

                {/* Metrics skeleton */}
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="w-24 shrink-0 space-y-2">
                      <Skeleton className="h-2 w-12" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>

                {/* Action button skeleton */}
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Incidents skeleton */}
        <div className="border-border rounded-xl border bg-white p-6">
          <div className="mb-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border-border flex items-start gap-4 rounded-lg border bg-white p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-8">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen space-y-8 pb-10">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Healthy Links",
            value: healthyCount,
            icon: CheckCircle,
            color: "text-emerald-500",
          },
          {
            label: "Warnings",
            value: warningCount,
            icon: WarningCircle,
            color: "text-amber-500",
          },
          {
            label: "Errors",
            value: errorCount,
            icon: XmarkCircle,
            color: "text-red-500",
          },
          {
            label: "Avg Uptime",
            value: `${avgUptime}%`,
            icon: ShieldCheck,
            color: "text-blue-500",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className="bg-card rounded-sm border-dashed border-black/20"
          >
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {stat.label}
                </p>
                <p className={cn("text-xl", stat.color)}>[{stat.value}]</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Bar */}
      {/* <div
        className="flex flex-col gap-4 border-y border-dashed p-2 sm:flex-row sm:items-center sm:justify-between"
        style={{
          backgroundImage: "url(/stripe.svg)",
          backgroundRepeat: "repeat",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="flex w-fit items-center gap-2 p-2">
          <span className="text-muted-foreground text-xs">Filter</span>
          {(["all", "healthy", "warning", "error"] as const).map((status) => (
            <Button
              type="button"
              variant={filter === status ? "default" : "outline"}
              size="sm"
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "text-sm font-medium transition-all",
                filter === status
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div> */}

      {/* Monitored Links */}
      {links.length === 0 ? (
        <Card className="bg-card/50 border-dashed p-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="bg-muted rounded-full p-4">
              <ShieldCheck className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-medium">No monitored links yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Create a shortened link and health monitoring will start
              automatically.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {links.map((link) => (
            <Card
              key={link.id}
              className="group bg-card relative overflow-hidden"
            >
              <div className="relative p-5">
                <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
                  {/* Link Info */}
                  <div className="flex flex-1 items-start">
                    <div className="flex items-center gap-10">
                      <div className="w-20">
                        <Badge
                          variant={
                            link.status === "healthy"
                              ? "green"
                              : link.status === "warning"
                                ? "yellow"
                                : "red"
                          }
                          className="capitalize"
                        >
                          {link.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <LinkWithFavicon
                          url={link.shortUrl}
                          originalUrl={link.originalUrl}
                        />
                        <p
                          className="text-muted-foreground max-w-[250px] truncate text-xs"
                          title={link.originalUrl}
                        >
                          {link.originalUrl}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Table */}
                  <div className="flex gap-2">
                    <div className="w-24 shrink-0 space-y-1">
                      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Uptime
                      </p>
                      <p className="font-mono text-xs">{link.uptime}%</p>
                    </div>
                    <div className="w-24 shrink-0 space-y-1">
                      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Latency
                      </p>
                      <p
                        className={cn(
                          "font-mono text-xs",
                          getResponseTimeColor(link.responseTime),
                        )}
                      >
                        {link.responseTime > 0
                          ? `${link.responseTime}ms`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="w-24 shrink-0 space-y-1">
                      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Incidents
                      </p>
                      <p className="font-mono text-xs">{link.incidents}</p>
                    </div>
                    <div className="w-24 shrink-0 space-y-1">
                      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        Checked
                      </p>
                      <p className="text-xs">{link.lastChecked}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center lg:flex-col lg:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-muted h-8 w-8 rounded-full p-0"
                      title="Check Now"
                    >
                      <Refresh className="text-muted-foreground h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Incidents Section */}
      <div className="pt-4">
        <RecentIncidents incidents={incidents} />
      </div>
    </div>
  );
}

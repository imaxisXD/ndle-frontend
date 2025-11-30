"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldXmark,
  Clock,
  Flash,
  RefreshDouble,
  CheckCircle,
  WarningCircle,
  XmarkCircle,
} from "iconoir-react";

interface LinkHealthPanelProps {
  shortUrl: string;
  fullUrl: string;
}

// Dummy health data
const DUMMY_HEALTH_DATA = {
  status: "healthy" as "healthy" | "warning" | "error",
  uptime: 99.9,
  responseTime: 245,
  lastChecked: "2 minutes ago",
  sslValid: true,
  sslExpiry: "2025-03-15",
  checksToday: 48,
  avgResponseTime: 267,
};

// Dummy incident history
const DUMMY_INCIDENTS = [
  {
    id: "1",
    type: "resolved" as const,
    message: "Connection timeout resolved",
    time: "2 hours ago",
    duration: "3 minutes",
  },
  {
    id: "2",
    type: "warning" as const,
    message: "Slow response time detected (1250ms)",
    time: "Yesterday",
    duration: "15 minutes",
  },
  {
    id: "3",
    type: "resolved" as const,
    message: "SSL certificate renewed successfully",
    time: "3 days ago",
    duration: "N/A",
  },
  {
    id: "4",
    type: "error" as const,
    message: "503 Service Unavailable",
    time: "1 week ago",
    duration: "8 minutes",
  },
];

// Dummy uptime history (last 30 days)
const DUMMY_UPTIME_BARS = Array.from({ length: 30 }, (_, i) => {
  const random = Math.random();
  if (random > 0.95) return "error";
  if (random > 0.9) return "warning";
  return "healthy";
});

export function LinkHealthPanel({ shortUrl, fullUrl }: LinkHealthPanelProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckNow = () => {
    setIsChecking(true);
    setTimeout(() => setIsChecking(false), 2000);
  };

  const getStatusIcon = (status: "healthy" | "warning" | "error") => {
    switch (status) {
      case "healthy":
        return <ShieldCheck className="size-6 text-green-600" />;
      case "warning":
        return <ShieldAlert className="size-6 text-yellow-600" />;
      case "error":
        return <ShieldXmark className="size-6 text-red-600" />;
    }
  };

  const getStatusBadge = (status: "healthy" | "warning" | "error") => {
    switch (status) {
      case "healthy":
        return <Badge variant="green">Healthy</Badge>;
      case "warning":
        return <Badge variant="yellow">Warning</Badge>;
      case "error":
        return <Badge variant="red">Error</Badge>;
    }
  };

  const getIncidentIcon = (type: "resolved" | "warning" | "error") => {
    switch (type) {
      case "resolved":
        return <CheckCircle className="size-4 text-green-600" />;
      case "warning":
        return <WarningCircle className="size-4 text-yellow-600" />;
      case "error":
        return <XmarkCircle className="size-4 text-red-600" />;
    }
  };

  const getResponseTimeColor = (time: number) => {
    if (time < 300) return "text-green-600";
    if (time < 800) return "text-yellow-600";
    return "text-red-600";
  };

  const getUptimeBarColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(DUMMY_HEALTH_DATA.status)}
              <div>
                <CardTitle className="text-base">Link Health Status</CardTitle>
                <CardDescription className="mt-0.5">
                  Real-time monitoring for this link
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(DUMMY_HEALTH_DATA.status)}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckNow}
                disabled={isChecking}
                className="gap-1.5"
              >
                <RefreshDouble
                  className={`size-3.5 ${isChecking ? "animate-spin" : ""}`}
                />
                {isChecking ? "Checking..." : "Check Now"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-muted/30 border-border rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-xs">Uptime</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-green-600">
                {DUMMY_HEALTH_DATA.uptime}%
              </p>
              <p className="text-muted-foreground mt-1 text-xs">Last 30 days</p>
            </div>

            <div className="bg-muted/30 border-border rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Flash className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-xs">
                  Response Time
                </span>
              </div>
              <p
                className={`mt-2 text-2xl font-semibold ${getResponseTimeColor(DUMMY_HEALTH_DATA.responseTime)}`}
              >
                {DUMMY_HEALTH_DATA.responseTime}ms
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Avg: {DUMMY_HEALTH_DATA.avgResponseTime}ms
              </p>
            </div>

            <div className="bg-muted/30 border-border rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Clock className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-xs">
                  Last Checked
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold">
                {DUMMY_HEALTH_DATA.lastChecked}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {DUMMY_HEALTH_DATA.checksToday} checks today
              </p>
            </div>

            <div className="bg-muted/30 border-border rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-xs">
                  SSL Status
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold text-green-600">
                {DUMMY_HEALTH_DATA.sslValid ? "Valid" : "Invalid"}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Expires: {DUMMY_HEALTH_DATA.sslExpiry}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Uptime History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Uptime History (Last 30 Days)
          </CardTitle>
          <CardDescription>
            Each bar represents one day of monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1">
            {DUMMY_UPTIME_BARS.map((status, index) => (
              <div
                key={index}
                className={`h-8 w-full rounded-sm ${getUptimeBarColor(status)} transition-all hover:opacity-80`}
                title={`Day ${30 - index}: ${status}`}
              />
            ))}
          </div>
          <div className="text-muted-foreground mt-3 flex items-center justify-between text-xs">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-green-500" />
              <span className="text-muted-foreground text-xs">Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-yellow-500" />
              <span className="text-muted-foreground text-xs">Warning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-3 rounded-sm bg-red-500" />
              <span className="text-muted-foreground text-xs">Error</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incident History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Incident History
          </CardTitle>
          <CardDescription>Recent alerts and resolved issues</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-border divide-y">
            {DUMMY_INCIDENTS.map((incident) => (
              <div
                key={incident.id}
                className="hover:bg-muted/30 flex items-start gap-3 px-5 py-3 transition-colors"
              >
                <div className="mt-0.5">{getIncidentIcon(incident.type)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">
                      {incident.message}
                    </p>
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
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      {incident.time}
                    </span>
                    {incident.duration !== "N/A" && (
                      <span className="text-muted-foreground text-xs">
                        Duration: {incident.duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="bg-muted/20 border-border border-t px-5 py-3">
            <p className="text-muted-foreground text-center text-xs">
              Showing mock data • Real monitoring coming soon
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}





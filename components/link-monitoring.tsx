"use client";

import { useState } from "react";
import { Badge } from "@ui/badge";
import { Card, CardContent, CardHeader } from "@ui/card";
import { RecentIncidents, type Incident } from "./recent-incidents";
import { Button } from "./ui/button";
import {
  CheckCircle,
  RefreshDouble,
  ShieldAlert,
  ShieldCheck,
  ShieldXmark,
  WarningCircle,
  XmarkCircle,
} from "iconoir-react";

interface MonitoredLink {
  id: string;
  shortUrl: string;
  originalUrl: string;
  status: "healthy" | "warning" | "error" | "checking";
  uptime: number;
  responseTime: number;
  lastChecked: string;
  incidents: number;
  ssl: boolean;
}

const mockLinks: MonitoredLink[] = [
  {
    id: "1",
    shortUrl: "ndle.im/a8x9k2",
    originalUrl: "https://example.com/blog/how-to-build-a-saas-product",
    status: "healthy",
    uptime: 99.9,
    responseTime: 245,
    lastChecked: "2 minutes ago",
    incidents: 0,
    ssl: true,
  },
  {
    id: "2",
    shortUrl: "ndle.im/m3p7q1",
    originalUrl: "https://example.com/documentation/getting-started",
    status: "warning",
    uptime: 98.5,
    responseTime: 1250,
    lastChecked: "5 minutes ago",
    incidents: 2,
    ssl: true,
  },
  {
    id: "3",
    shortUrl: "ndle.im/k9n2w5",
    originalUrl: "https://example.com/pricing/enterprise-plan",
    status: "checking",
    uptime: 100,
    responseTime: 180,
    lastChecked: "Just now",
    incidents: 0,
    ssl: true,
  },
  {
    id: "4",
    shortUrl: "ndle.im/p4r8t3",
    originalUrl: "https://example.com/features/analytics-dashboard",
    status: "healthy",
    uptime: 99.8,
    responseTime: 320,
    lastChecked: "1 minute ago",
    incidents: 1,
    ssl: true,
  },
  {
    id: "5",
    shortUrl: "ndle.im/x7y2z9",
    originalUrl: "https://example.com/old-page-404",
    status: "error",
    uptime: 85.2,
    responseTime: 0,
    lastChecked: "10 minutes ago",
    incidents: 8,
    ssl: false,
  },
];

export function LinkMonitoring() {
  const [filter, setFilter] = useState<"all" | "healthy" | "warning" | "error">(
    "all",
  );

  const filteredLinks = mockLinks.filter((link) => {
    if (filter === "all") return true;
    return link.status === filter;
  });

  const getStatusIcon = (status: MonitoredLink["status"]) => {
    switch (status) {
      case "healthy":
        return <ShieldCheck className="h-5 w-5 text-green-600" />;
      case "warning":
        return <ShieldAlert className="h-5 w-5 text-yellow-600" />;
      case "error":
        return <ShieldXmark className="h-5 w-5 text-red-600" />;
      case "checking":
        return <RefreshDouble className="size-4 animate-spin text-blue-600" />;
    }
  };

  const getStatusVariant = (
    status: MonitoredLink["status"],
  ): "green" | "yellow" | "red" | "blue" => {
    switch (status) {
      case "healthy":
        return "green";
      case "warning":
        return "yellow";
      case "error":
        return "red";
      case "checking":
        return "blue";
    }
  };

  const getResponseTimeColor = (time: number) => {
    if (time === 0) return "text-red-600";
    if (time < 500) return "text-green-600";
    if (time < 1000) return "text-yellow-600";
    return "text-red-600";
  };

  const healthyCount = mockLinks.filter((l) => l.status === "healthy").length;
  const warningCount = mockLinks.filter((l) => l.status === "warning").length;
  const errorCount = mockLinks.filter((l) => l.status === "error").length;
  const avgUptime = (
    mockLinks.reduce((sum, l) => sum + l.uptime, 0) / mockLinks.length
  ).toFixed(1);

  const incidents: Array<Incident> = [
    {
      id: "1",
      link: "ndle.im/x7y2z9",
      type: "error",
      message: "404 Not Found - Page does not exist",
      time: "10 minutes ago",
    },
    {
      id: "2",
      link: "ndle.im/m3p7q1",
      type: "warning",
      message: "Slow response time detected (1250ms)",
      time: "25 minutes ago",
    },
    {
      id: "3",
      link: "ndle.im/p4r8t3",
      type: "resolved",
      message: "Connection timeout resolved",
      time: "2 hours ago",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Healthy Links</p>
              <p className="mt-2 text-2xl font-medium text-green-600">
                {healthyCount}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Warnings</p>
              <p className="mt-2 text-2xl font-medium text-yellow-600">
                {warningCount}
              </p>
            </div>
            <WarningCircle className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Errors</p>
              <p className="mt-2 text-2xl font-medium text-red-600">
                {errorCount}
              </p>
            </div>
            <XmarkCircle className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Avg Uptime</p>
              <p className="mt-2 text-2xl font-medium">{avgUptime}%</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-emerald-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "healthy", "warning", "error"] as const).map((status) => (
          <button
            type="button"
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-md px-4 py-2 text-sm transition-colors ${
              filter === status
                ? "bg-foreground text-background"
                : "border-border bg-background hover:bg-accent border"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Monitored Links */}
      <div className="space-y-3">
        {filteredLinks.map((link) => (
          <Card key={link.id}>
            <CardHeader className="items-start gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  {getStatusIcon(link.status)}
                  <code className="text-sm font-medium">{link.shortUrl}</code>
                  <Badge
                    variant={getStatusVariant(link.status)}
                    label={
                      link.status.charAt(0).toUpperCase() + link.status.slice(1)
                    }
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  {link.originalUrl}
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="border text-xs"
              >
                Check Now
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-muted-foreground text-xs">Uptime</p>
                  <p className="mt-1 text-sm font-medium">{link.uptime}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Response Time</p>
                  <p
                    className={`mt-1 text-sm font-medium ${getResponseTimeColor(
                      link.responseTime,
                    )}`}
                  >
                    {link.responseTime > 0 ? `${link.responseTime}ms` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Incidents</p>
                  <p className="mt-1 text-sm font-medium">{link.incidents}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Last Checked</p>
                  <p className="mt-1 text-sm font-medium">{link.lastChecked}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RecentIncidents incidents={incidents} />
    </div>
  );
}

"use client"

import { useState } from "react"
import { CheckCircle2Icon, AlertCircleIcon, RefreshCwIcon, ShieldIcon } from "./icons"

interface MonitoredLink {
  id: string
  shortUrl: string
  originalUrl: string
  status: "healthy" | "warning" | "error" | "checking"
  uptime: number
  responseTime: number
  lastChecked: string
  incidents: number
  ssl: boolean
}

const mockLinks: MonitoredLink[] = [
  {
    id: "1",
    shortUrl: "short.link/a8x9k2",
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
    shortUrl: "short.link/m3p7q1",
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
    shortUrl: "short.link/k9n2w5",
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
    shortUrl: "short.link/p4r8t3",
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
    shortUrl: "short.link/x7y2z9",
    originalUrl: "https://example.com/old-page-404",
    status: "error",
    uptime: 85.2,
    responseTime: 0,
    lastChecked: "10 minutes ago",
    incidents: 8,
    ssl: false,
  },
]

export function LinkMonitoring() {
  const [filter, setFilter] = useState<"all" | "healthy" | "warning" | "error">("all")

  const filteredLinks = mockLinks.filter((link) => {
    if (filter === "all") return true
    return link.status === filter
  })

  const getStatusIcon = (status: MonitoredLink["status"]) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2Icon className="h-5 w-5 text-green-600" />
      case "warning":
        return <AlertCircleIcon className="h-5 w-5 text-yellow-600" />
      case "error":
        return <AlertCircleIcon className="h-5 w-5 text-red-600" />
      case "checking":
        return <RefreshCwIcon className="h-5 w-5 text-blue-600 animate-spin" />
    }
  }

  const getStatusBadge = (status: MonitoredLink["status"]) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-700 border-green-200"
      case "warning":
        return "bg-yellow-100 text-yellow-700 border-yellow-200"
      case "error":
        return "bg-red-100 text-red-700 border-red-200"
      case "checking":
        return "bg-blue-100 text-blue-700 border-blue-200"
    }
  }

  const getResponseTimeColor = (time: number) => {
    if (time === 0) return "text-red-600"
    if (time < 500) return "text-green-600"
    if (time < 1000) return "text-yellow-600"
    return "text-red-600"
  }

  const healthyCount = mockLinks.filter((l) => l.status === "healthy").length
  const warningCount = mockLinks.filter((l) => l.status === "warning").length
  const errorCount = mockLinks.filter((l) => l.status === "error").length
  const avgUptime = (mockLinks.reduce((sum, l) => sum + l.uptime, 0) / mockLinks.length).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">Healthy Links</p>
              <p className="mt-2 font-mono text-2xl font-medium text-green-600">{healthyCount}</p>
            </div>
            <CheckCircle2Icon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">Warnings</p>
              <p className="mt-2 font-mono text-2xl font-medium text-yellow-600">{warningCount}</p>
            </div>
            <AlertCircleIcon className="h-8 w-8 text-yellow-600" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">Errors</p>
              <p className="mt-2 font-mono text-2xl font-medium text-red-600">{errorCount}</p>
            </div>
            <AlertCircleIcon className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs text-muted-foreground">Avg Uptime</p>
              <p className="mt-2 font-mono text-2xl font-medium">{avgUptime}%</p>
            </div>
            <ShieldIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "healthy", "warning", "error"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-md px-4 py-2 font-mono text-sm transition-colors ${
              filter === status ? "bg-foreground text-background" : "border border-border bg-background hover:bg-accent"
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Monitored Links */}
      <div className="space-y-3">
        {filteredLinks.map((link) => (
          <div key={link.id} className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  {getStatusIcon(link.status)}
                  <code className="font-mono text-sm font-medium">{link.shortUrl}</code>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-xs ${getStatusBadge(link.status)}`}>
                    {link.status.charAt(0).toUpperCase() + link.status.slice(1)}
                  </span>
                  {link.ssl && <ShieldIcon className="h-4 w-4 text-green-600" title="SSL Enabled" />}
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{link.originalUrl}</p>

                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">Uptime</p>
                    <p className="mt-1 font-mono text-sm font-medium">{link.uptime}%</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">Response Time</p>
                    <p className={`mt-1 font-mono text-sm font-medium ${getResponseTimeColor(link.responseTime)}`}>
                      {link.responseTime > 0 ? `${link.responseTime}ms` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">Incidents</p>
                    <p className="mt-1 font-mono text-sm font-medium">{link.incidents}</p>
                  </div>
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">Last Checked</p>
                    <p className="mt-1 font-mono text-sm font-medium">{link.lastChecked}</p>
                  </div>
                </div>
              </div>

              <button className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs transition-colors hover:bg-accent">
                Check Now
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="font-mono text-base font-medium">Recent Incidents</h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">Latest monitoring alerts and issues</p>
        </div>

        <div className="space-y-3">
          {[
            {
              id: "1",
              link: "short.link/x7y2z9",
              type: "error",
              message: "404 Not Found - Page does not exist",
              time: "10 minutes ago",
            },
            {
              id: "2",
              link: "short.link/m3p7q1",
              type: "warning",
              message: "Slow response time detected (1250ms)",
              time: "25 minutes ago",
            },
            {
              id: "3",
              link: "short.link/p4r8t3",
              type: "resolved",
              message: "Connection timeout resolved",
              time: "2 hours ago",
            },
          ].map((incident) => (
            <div key={incident.id} className="flex items-start gap-4 rounded-lg border border-border bg-background p-4">
              <div className="flex-shrink-0 mt-0.5">
                {incident.type === "error" && <AlertCircleIcon className="h-5 w-5 text-red-600" />}
                {incident.type === "warning" && <AlertCircleIcon className="h-5 w-5 text-yellow-600" />}
                {incident.type === "resolved" && <CheckCircle2Icon className="h-5 w-5 text-green-600" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-sm font-medium">{incident.link}</code>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                      incident.type === "error"
                        ? "bg-red-100 text-red-700"
                        : incident.type === "warning"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {incident.type.charAt(0).toUpperCase() + incident.type.slice(1)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm text-muted-foreground">{incident.message}</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">{incident.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

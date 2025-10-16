"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/base-select";
import {
  Archive,
  CursorPointer,
  Globe,
  MagicWand,
  ShieldCheck,
  StatsDownSquare,
} from "iconoir-react";

export function Analytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">(
    "30d",
  );

  const stats = [
    {
      label: "Total Links",
      value: "24",
      icon: StatsDownSquare,
      change: "[+3] this week",
      trend: "up",
    },
    {
      label: "Total Clicks",
      value: "1,429",
      icon: CursorPointer,
      change: "[+127] today",
      trend: "up",
    },
    {
      label: "Auto-Healed",
      value: "8",
      icon: ShieldCheck,
      change: "[3] active",
      trend: "neutral",
    },
    {
      label: "Archived",
      value: "12",
      icon: Archive,
      change: "via Wayback",
      trend: "neutral",
    },
    {
      label: "AI Conversations",
      value: "45",
      icon: MagicWand,
      change: "[18] this week",
      trend: "up",
    },
    {
      label: "Countries",
      value: "12",
      icon: Globe,
      change: "[5] new",
      trend: "up",
    },
  ];

  const clicksData = [
    { day: "Mon", clicks: 145 },
    { day: "Tue", clicks: 189 },
    { day: "Wed", clicks: 234 },
    { day: "Thu", clicks: 198 },
    { day: "Fri", clicks: 267 },
    { day: "Sat", clicks: 156 },
    { day: "Sun", clicks: 240 },
  ];

  const topLinks = [
    {
      url:
        (process.env.NODE_ENV === "development" ? "dev.ndle.im" : "ndle.im") +
        "/a8x9k2",
      clicks: 567,
      change: "+12%",
    },
    {
      url:
        (process.env.NODE_ENV === "development" ? "dev.ndle.im" : "ndle.im") +
        "/k9n2w5",
      clicks: 342,
      change: "+8%",
    },
    {
      url:
        (process.env.NODE_ENV === "development" ? "dev.ndle.im" : "ndle.im") +
        "/p4r8t3",
      clicks: 234,
      change: "+15%",
    },
    {
      url:
        (process.env.NODE_ENV === "development" ? "dev.ndle.im" : "ndle.im") +
        "/m3p7q1",
      clicks: 189,
      change: "-3%",
    },
    {
      url:
        (process.env.NODE_ENV === "development" ? "dev.ndle.im" : "ndle.im") +
        "/x7y2z9",
      clicks: 97,
      change: "+5%",
    },
  ];

  const topCountries = [
    { country: "United States", clicks: 456, percentage: 32 },
    { country: "United Kingdom", clicks: 289, percentage: 20 },
    { country: "Germany", clicks: 214, percentage: 15 },
    { country: "Canada", clicks: 186, percentage: 13 },
    { country: "France", clicks: 142, percentage: 10 },
  ];

  const maxClicks = Math.max(...clicksData.map((d) => d.clicks));

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                  <p className="mt-2 text-2xl font-medium">{stat.value}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {stat.change}
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <stat.icon className="text-muted-foreground h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clicks Over Time */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium">Clicks Over Time</h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  Daily click activity
                </p>
              </div>
              <Select
                value={timeRange}
                onValueChange={(value) =>
                  setTimeRange(value as typeof timeRange)
                }
              >
                <SelectTrigger size="sm" className="bg-white shadow-2xl">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-5.5">
              {clicksData.map((data) => (
                <div key={data.day} className="flex items-center gap-3">
                  <span className="w-8 text-sm">{data.day}</span>
                  <div className="flex-1">
                    <div className="bg-muted h-2 overflow-hidden rounded-md">
                      <div
                        className="bg-foreground h-full transition-all duration-500"
                        style={{ width: `${(data.clicks / maxClicks) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs font-medium">
                    {data.clicks}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-border mt-6 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Average per day
                </span>
                <span className="text-sm font-medium">
                  {Math.round(
                    clicksData.reduce((sum, d) => sum + d.clicks, 0) /
                      clicksData.length,
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-base font-medium">Top Countries</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Clicks by geographic location
              </p>
            </div>

            <div className="space-y-6">
              {topCountries.map((country) => (
                <div key={country.country}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm">{country.country}</span>
                    <span className="text-sm font-medium">
                      {country.clicks}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-foreground h-full transition-all duration-500"
                      style={{ width: `${country.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-border mt-6 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs">
                  Total countries
                </span>
                <span className="text-sm font-medium">12</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performing Links */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-base font-medium">Top Performing Links</h3>
            <p className="text-muted-foreground mt-1 text-xs">
              Most clicked links in the selected period
            </p>
          </div>

          <div className="space-y-3">
            {topLinks.map((link, index) => (
              <div
                key={link.url}
                className="border-border bg-background hover:bg-muted/30 flex items-center justify-between rounded-lg border p-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <code className="text-sm font-medium">{link.url}</code>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-medium">{link.clicks}</p>
                    <p className="text-muted-foreground text-xs">clicks</p>
                  </div>
                  <span
                    className={`text-xs ${
                      link.change.startsWith("+")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {link.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Healing Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-base font-medium">Healing Activity</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                Self-healing link statistics
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Successfully Healed
                  </p>
                  <p className="mt-1 text-xs text-green-700">
                    Links automatically fixed
                  </p>
                </div>
                <p className="text-2xl font-medium text-green-900">8</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Currently Checking
                  </p>
                  <p className="mt-1 text-xs text-yellow-700">
                    Links being monitored
                  </p>
                </div>
                <p className="text-2xl font-medium text-yellow-900">3</p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Archived Backups
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    Wayback Machine saves
                  </p>
                </div>
                <p className="text-2xl font-medium text-blue-900">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-base font-medium">AI Usage</h3>
              <p className="text-muted-foreground mt-1 text-xs">
                AI-powered features activity
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-background border-border flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Summaries Generated</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    AI content summaries
                  </p>
                </div>
                <p className="text-2xl font-medium">24</p>
              </div>

              <div className="bg-background border-border flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Chat Conversations</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    AI chat interactions
                  </p>
                </div>
                <p className="text-2xl font-medium">45</p>
              </div>

              <div className="bg-background border-border flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Memory Entries</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Saved context & notes
                  </p>
                </div>
                <p className="text-2xl font-medium">18</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

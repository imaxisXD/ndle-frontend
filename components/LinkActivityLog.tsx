"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
// import { Clock, SmartphoneIcon, Desktop, Tablet } from "iconoir-react";
import { Clock, Smartphone, Computer, Tablet } from "lucide-react";

// Dummy activity data
const DUMMY_ACTIVITY_DATA = [
  {
    id: "1",
    timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
    location: "San Francisco, US",
    country: "US",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
  },
  {
    id: "2",
    timestamp: Date.now() - 1000 * 60 * 23, // 23 minutes ago
    location: "London, UK",
    country: "GB",
    device: "mobile",
    browser: "Safari",
    os: "iOS",
  },
  {
    id: "3",
    timestamp: Date.now() - 1000 * 60 * 45, // 45 minutes ago
    location: "Berlin, DE",
    country: "DE",
    device: "desktop",
    browser: "Firefox",
    os: "Windows",
  },
  {
    id: "4",
    timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    location: "Tokyo, JP",
    country: "JP",
    device: "mobile",
    browser: "Chrome",
    os: "Android",
  },
  {
    id: "5",
    timestamp: Date.now() - 1000 * 60 * 60 * 3, // 3 hours ago
    location: "Sydney, AU",
    country: "AU",
    device: "tablet",
    browser: "Safari",
    os: "iPadOS",
  },
  {
    id: "6",
    timestamp: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    location: "New York, US",
    country: "US",
    device: "desktop",
    browser: "Edge",
    os: "Windows",
  },
  {
    id: "7",
    timestamp: Date.now() - 1000 * 60 * 60 * 8, // 8 hours ago
    location: "Paris, FR",
    country: "FR",
    device: "mobile",
    browser: "Chrome",
    os: "Android",
  },
  {
    id: "8",
    timestamp: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
    location: "Toronto, CA",
    country: "CA",
    device: "desktop",
    browser: "Chrome",
    os: "macOS",
  },
  {
    id: "9",
    timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    location: "Mumbai, IN",
    country: "IN",
    device: "mobile",
    browser: "Chrome",
    os: "Android",
  },
  {
    id: "10",
    timestamp: Date.now() - 1000 * 60 * 60 * 36, // 1.5 days ago
    location: "Singapore, SG",
    country: "SG",
    device: "desktop",
    browser: "Safari",
    os: "macOS",
  },
];

function getDeviceIcon(device: string) {
  switch (device) {
    case "mobile":
      return <Smartphone className="size-4" />;
    case "tablet":
      return <Tablet className="size-4" />;
    default:
      return <Computer className="size-4" />;
  }
}

function getCountryFlag(countryCode: string) {
  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function LinkActivityLog() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="text-muted-foreground size-4" />
          Recent Activity
        </CardTitle>
        <CardDescription>Last 10 clicks on this link</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-border divide-y">
          {DUMMY_ACTIVITY_DATA.map((activity) => (
            <div
              key={activity.id}
              className="hover:bg-muted/30 flex items-center justify-between gap-4 px-5 py-3 transition-colors"
            >
              {/* Left side: Time and Location */}
              <div className="flex min-w-0 items-center gap-4">
                <div className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatRelative(activity.timestamp)}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base" title={activity.country}>
                    {getCountryFlag(activity.country)}
                  </span>
                  <span className="truncate text-sm">{activity.location}</span>
                </div>
              </div>

              {/* Right side: Device and Browser */}
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-muted-foreground flex items-center gap-1.5">
                  {getDeviceIcon(activity.device)}
                  <span className="hidden text-xs capitalize sm:inline">
                    {activity.device}
                  </span>
                </div>
                <Badge variant="default" className="text-xs">
                  {activity.browser}
                </Badge>
                <span className="text-muted-foreground hidden text-xs md:inline">
                  {activity.os}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="bg-muted/20 border-border border-t px-5 py-3">
          <p className="text-muted-foreground text-center text-xs">
            Showing mock data • Real activity tracking coming soon
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

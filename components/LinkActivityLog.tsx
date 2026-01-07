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
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClockUserIcon,
  DesktopTowerIcon,
  DeviceMobileCameraIcon,
  DeviceTabletCameraIcon,
} from "@phosphor-icons/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function getDeviceIcon(device: string) {
  switch (device?.toLowerCase()) {
    case "mobile":
      return <DeviceMobileCameraIcon className="size-4" />;
    case "tablet":
      return <DeviceTabletCameraIcon className="size-4" />;
    default:
      return <DesktopTowerIcon className="size-4" />;
  }
}

function getCountryFlag(countryCode: string) {
  if (!countryCode || countryCode === "Unknown") return "🌍";
  // Convert country code to flag emoji
  const codePoints = countryCode
    .toUpperCase()
    .slice(0, 2)
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function formatLocation(country: string, city: string | undefined): string {
  if (city && country && country !== "Unknown") {
    return `${city}, ${country}`;
  }
  if (country && country !== "Unknown") {
    return country;
  }
  return "Unknown location";
}

interface LinkActivityLogProps {
  linkSlug: string;
}

export function LinkActivityLog({ linkSlug }: LinkActivityLogProps) {
  // Use Convex reactive query - auto-updates when new clicks arrive!
  const activities = useQuery(api.clickEvents.getRecentByLinkSlug, {
    linkSlug,
    limit: 20,
  });

  const isLoading = activities === undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClockUserIcon className="text-muted-foreground size-4" />
          Recent Activity
          {activities && activities.length > 0 && (
            <span className="relative ml-auto flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
            </span>
          )}
        </CardTitle>
        <CardDescription>Real-time clicks on this link</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="divide-border divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="text-muted-foreground px-5 py-8 text-center text-sm">
            No clicks recorded yet
          </div>
        ) : (
          <div className="divide-border divide-y">
            {activities.map((activity) => (
              <div
                key={activity._id}
                className="hover:bg-muted/30 flex items-center justify-between gap-4 px-5 py-3 transition-colors"
              >
                {/* Left side: Time and Location */}
                <div className="flex min-w-0 items-center gap-4">
                  <div className="text-muted-foreground text-xs whitespace-nowrap">
                    {formatRelative(activity.occurredAt)}
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-base" title={activity.country}>
                      {getCountryFlag(activity.country)}
                    </span>
                    <span className="truncate text-sm">
                      {formatLocation(activity.country, activity.city)}
                    </span>
                  </div>
                </div>

                {/* Right side: Device and Browser */}
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-muted-foreground flex items-center gap-1.5">
                    {getDeviceIcon(activity.deviceType)}
                    <span className="hidden text-xs capitalize sm:inline">
                      {activity.deviceType}
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
        )}

        {/* Footer */}
        {activities && activities.length > 0 && (
          <div className="bg-muted/20 border-border border-t px-5 py-3">
            <p className="text-muted-foreground text-center text-xs">
              Real-time updates • {activities.length} recent clicks
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

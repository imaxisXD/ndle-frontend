"use client";

import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import { Link, Clock, AntennaSignal } from "iconoir-react";
import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr";

interface LinkSettingsPanelProps {
  fullUrl?: string;
  trackingEnabled?: boolean;
  expiresAt?: number;
  qrEnabled?: boolean;
  qrStyle?: {
    fg?: string;
    bg?: string;
    logoMode?: "brand" | "custom" | "none";
  };
  creationTime?: number;
}

export function LinkSettingsPanel({
  fullUrl = "",
  trackingEnabled = true,
  expiresAt,
  qrEnabled = false,
  qrStyle,
  creationTime,
}: LinkSettingsPanelProps) {
  const isExpired = expiresAt ? expiresAt < Date.now() : false;
  const expirationText = expiresAt
    ? isExpired
      ? `Expired ${formatRelative(expiresAt)}`
      : `Expires ${formatRelative(expiresAt)}`
    : "Never expires";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Destination URL Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link className="text-muted-foreground size-4" aria-hidden="true" />
            <CardTitle className="text-sm font-medium">Destination URL</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-2 text-sm break-all">
            {fullUrl || "No destination set"}
          </p>
        </CardContent>
      </Card>

      {/* Tracking Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AntennaSignal className="text-muted-foreground size-4" aria-hidden="true" />
            <CardTitle className="text-sm font-medium">Analytics Tracking</CardTitle>
          </div>
          <CardToolbar>
            <Badge variant={trackingEnabled ? "green" : "default"}>
              {trackingEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {trackingEnabled
              ? "Tracks clicks, devices, referrers, and locations."
              : "Click analytics tracking is turned off for this link."}
          </p>
        </CardContent>
      </Card>

      {/* Expiration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-4" aria-hidden="true" />
            <CardTitle className="text-sm font-medium">Expiration</CardTitle>
          </div>
          <CardToolbar>
            <Badge variant={isExpired ? "red" : expiresAt ? "yellow" : "default"}>
              {isExpired ? "Expired" : expiresAt ? "Scheduled" : "Never"}
            </Badge>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{expirationText}</p>
          {creationTime && (
            <p className="text-muted-foreground/70 mt-2 text-xs">
              Created {formatRelative(creationTime)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* QR Code Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <QrCodeIcon
              className="text-muted-foreground size-4"
              strokeWidth={1.4}
              aria-hidden="true"
            />
            <CardTitle className="text-sm font-medium">QR Code</CardTitle>
          </div>
          <CardToolbar>
            <Badge variant={qrEnabled ? "green" : "default"}>
              {qrEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          {qrEnabled && qrStyle ? (
            <div className="text-muted-foreground space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span>Colors:</span>
                <div
                  className="border-border size-4 rounded border"
                  style={{ backgroundColor: qrStyle.fg || "#000000" }}
                  title="Foreground"
                />
                <div
                  className="border-border size-4 rounded border"
                  style={{
                    backgroundColor:
                      qrStyle.bg === "transparent" ? "transparent" : qrStyle.bg || "#ffffff",
                  }}
                  title="Background"
                />
              </div>
              <p>
                Logo:{" "}
                {qrStyle.logoMode === "brand"
                  ? "Brand"
                  : qrStyle.logoMode === "custom"
                    ? "Custom"
                    : "None"}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">QR code is not enabled for this link</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

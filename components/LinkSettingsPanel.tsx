"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/utils";
import {
  Link,
  Clock,
  AntennaSignal,
  EditPencil,
  Check,
  Xmark,
} from "iconoir-react";
import { QrCodeIcon } from "lucide-react";

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
  onUpdateTracking?: (enabled: boolean) => void;
  onUpdateDestination?: (url: string) => void;
}

export function LinkSettingsPanel({
  fullUrl = "",
  trackingEnabled = true,
  expiresAt,
  qrEnabled = false,
  qrStyle,
  creationTime,
  onUpdateTracking,
  onUpdateDestination,
}: LinkSettingsPanelProps) {
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [editedUrl, setEditedUrl] = useState(fullUrl);

  const handleSaveUrl = () => {
    if (onUpdateDestination) {
      onUpdateDestination(editedUrl);
    }
    setIsEditingUrl(false);
  };

  const handleCancelEdit = () => {
    setEditedUrl(fullUrl);
    setIsEditingUrl(false);
  };

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
            <Link className="text-muted-foreground size-4" />
            <CardTitle className="text-sm font-medium">
              Destination URL
            </CardTitle>
          </div>
          <CardToolbar>
            {!isEditingUrl ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditingUrl(true)}
                disabled // Disabled for now - just UI
                className="gap-1.5 text-xs"
              >
                <EditPencil className="size-3.5" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSaveUrl}
                  className="gap-1 text-xs text-green-600 hover:text-green-700"
                >
                  <Check className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="gap-1 text-xs text-red-600 hover:text-red-700"
                >
                  <Xmark className="size-3.5" />
                </Button>
              </div>
            )}
          </CardToolbar>
        </CardHeader>
        <CardContent>
          {isEditingUrl ? (
            <Input
              value={editedUrl}
              onChange={(e) => setEditedUrl(e.target.value)}
              placeholder="https://example.com"
              className="text-sm"
            />
          ) : (
            <p className="text-muted-foreground line-clamp-2 text-sm break-all">
              {fullUrl || "No destination set"}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tracking Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AntennaSignal className="text-muted-foreground size-4" />
            <CardTitle className="text-sm font-medium">
              Analytics Tracking
            </CardTitle>
          </div>
          <CardToolbar>
            <Badge variant={trackingEnabled ? "green" : "default"}>
              {trackingEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardToolbar>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Checkbox
              id="tracking-toggle"
              checked={trackingEnabled}
              onCheckedChange={(checked) => {
                if (onUpdateTracking) {
                  onUpdateTracking(checked === true);
                }
              }}
              disabled // Disabled for now - just UI
              size="md"
            />
            <label
              htmlFor="tracking-toggle"
              className="text-muted-foreground cursor-pointer text-sm"
            >
              Track clicks, devices, and locations
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Expiration Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-4" />
            <CardTitle className="text-sm font-medium">Expiration</CardTitle>
          </div>
          <CardToolbar>
            <Badge
              variant={isExpired ? "red" : expiresAt ? "yellow" : "default"}
            >
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
                      qrStyle.bg === "transparent"
                        ? "transparent"
                        : qrStyle.bg || "#ffffff",
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
            <p className="text-muted-foreground text-sm">
              QR code is not enabled for this link
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

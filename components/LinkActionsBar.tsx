"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/base-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  ShareAndroid,
  QrCode,
  OpenNewWindow,
  Download,
} from "iconoir-react";

interface LinkActionsBarProps {
  shortUrl: string;
  fullUrl: string;
  qrEnabled?: boolean;
  status?: "active" | "expired" | "scheduled";
  onDownloadQR?: () => void;
}

export function LinkActionsBar({
  shortUrl,
  qrEnabled = false,
  status = "active",
  onDownloadQR,
}: LinkActionsBarProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const normalized = shortUrl.startsWith("http")
        ? shortUrl
        : `https://${shortUrl}`;
      await navigator.clipboard.writeText(normalized);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenInNewTab = () => {
    const normalized = shortUrl.startsWith("http")
      ? shortUrl
      : `https://${shortUrl}`;
    window.open(normalized, "_blank", "noopener");
  };

  const handleShare = async () => {
    const normalized = shortUrl.startsWith("http")
      ? shortUrl
      : `https://${shortUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Shared Link",
          url: normalized,
        });
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled or failed:", err);
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  const statusVariant =
    status === "active" ? "green" : status === "expired" ? "red" : "yellow";
  const statusLabel =
    status === "active"
      ? "Active"
      : status === "expired"
        ? "Expired"
        : "Scheduled";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Status Badge */}
      <Badge variant={statusVariant} className="text-xs">
        {statusLabel}
      </Badge>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <>
                    <Check
                      className="size-3.5 text-green-600"
                      strokeWidth={2}
                    />
                    <span className="text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" strokeWidth={1.8} />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            }
          />
          <TooltipContent side="bottom">Copy short link</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="sm" onClick={handleShare}>
                <ShareAndroid className="size-3.5" strokeWidth={1.8} />
                <span className="hidden sm:inline">Share</span>
              </Button>
            }
          />
          <TooltipContent side="bottom">Share link</TooltipContent>
        </Tooltip>

        {qrEnabled && onDownloadQR && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="sm" onClick={onDownloadQR}>
                  <Download className="size-3.5" strokeWidth={1.8} />
                  <QrCode className="size-3.5" strokeWidth={1.8} />
                </Button>
              }
            />
            <TooltipContent side="bottom">Download QR Code</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                <OpenNewWindow className="size-3.5" strokeWidth={1.8} />
                <span className="hidden sm:inline">Open</span>
              </Button>
            }
          />
          <TooltipContent side="bottom">Open in new tab</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

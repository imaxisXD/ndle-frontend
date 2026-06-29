"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/base-tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  ShareAndroid,
  QrCode,
  OpenNewWindow,
  Download,
} from "iconoir-react";
import { cn } from "@/lib/utils";

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
  const checkWrapRef = useRef<HTMLSpanElement>(null);
  const checkPathRef = useRef<SVGPathElement>(null);

  // Calibrate the stroke-draw to this exact path once it's mounted.
  useEffect(() => {
    const path = checkPathRef.current;
    if (!path) return;
    const len = Math.ceil(path.getTotalLength());
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
  }, []);

  // Play the celebratory success-check appear the moment `copied` flips true.
  useEffect(() => {
    if (!copied) return;
    const node = checkWrapRef.current;
    if (!node) return;

    // Replay from an already-visible state: reset → reflow → run.
    node.setAttribute("data-state", "out");
    void node.offsetWidth; // force reflow so keyframes restart from offset 0
    node.setAttribute("data-state", "in");
  }, [copied]);

  const handleCopy = async () => {
    try {
      const normalized = /^https?:\/\//i.test(shortUrl)
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
    const normalized = /^https?:\/\//i.test(shortUrl)
      ? shortUrl
      : `https://${shortUrl}`;
    window.open(normalized, "_blank", "noopener");
  };

  const handleShare = async () => {
    const normalized = /^https?:\/\//i.test(shortUrl)
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
                {/* Icon slot: clipboard (a) cross-fades to the success
                    check (b) when `copied` toggles. */}
                <span
                  className="t-icon-swap size-3.5"
                  data-state={copied ? "b" : "a"}
                >
                  <span className="t-icon" data-icon="a" aria-hidden="true">
                    <Copy className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <span className="t-icon" data-icon="b" aria-hidden="true">
                    {/* success-check: plays the celebratory draw on `copied` */}
                    <span
                      ref={checkWrapRef}
                      className="t-success-check size-3.5 text-green-600"
                      data-state="out"
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
                        <path
                          ref={checkPathRef}
                          d="M5 12.5 L10 17.5 L19 6.5"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </span>
                </span>
                <span className={cn(copied && "text-green-600")}>
                  {copied ? "Copied!" : "Copy"}
                </span>
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

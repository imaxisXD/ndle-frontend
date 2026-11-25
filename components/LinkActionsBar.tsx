"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/base-tooltip";
import { Badge } from "@/components/ui/badge";
import { Copy, ShareAndroid, QrCode, OpenNewWindow, Download } from "iconoir-react";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface LinkActionsBarProps {
  shortUrl: string;
  fullUrl: string;
  qrEnabled?: boolean;
  status?: "active" | "expired" | "scheduled";
  onDownloadQR?: () => void;
}

// Comfortable touch size on phones; the compact size stays from sm up.
const phoneTapTarget = "max-sm:h-10 max-sm:min-w-10";

export function LinkActionsBar({
  shortUrl,
  qrEnabled = false,
  status = "active",
  onDownloadQR,
}: LinkActionsBarProps) {
  const { copied, copy } = useCopyToClipboard();
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

  const normalizedShortUrl = /^https?:\/\//i.test(shortUrl) ? shortUrl : `https://${shortUrl}`;

  const handleCopy = () => {
    void copy(normalizedShortUrl);
  };

  const handleOpenInNewTab = () => {
    window.open(normalizedShortUrl, "_blank", "noopener");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Shared Link",
          url: normalizedShortUrl,
        });
      } catch {
        // User dismissed share sheet.
      }
    } else {
      handleCopy();
    }
  };

  const statusVariant = status === "active" ? "green" : status === "expired" ? "red" : "yellow";
  const statusLabel =
    status === "active" ? "Active" : status === "expired" ? "Expired" : "Scheduled";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3">
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
                className={cn("gap-1.5", phoneTapTarget)}
              >
                <span className="t-icon-swap size-3.5" data-state={copied ? "b" : "a"}>
                  <span className="t-icon" data-icon="a" aria-hidden="true">
                    <Copy className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <span className="t-icon" data-icon="b" aria-hidden="true">
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
              <Button
                variant="outline"
                size="sm"
                aria-label="Share link"
                onClick={handleShare}
                className={phoneTapTarget}
              >
                <ShareAndroid className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
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
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Download QR code"
                  onClick={onDownloadQR}
                  className={phoneTapTarget}
                >
                  <Download className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
                  <QrCode className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
                </Button>
              }
            />
            <TooltipContent side="bottom">Download QR Code</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                aria-label="Open link in new tab"
                onClick={handleOpenInNewTab}
                className={phoneTapTarget}
              >
                <OpenNewWindow className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
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

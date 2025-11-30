"use client";

import { formatRelative } from "@/lib/utils";
import { Card, CardContent } from "./ui/card";
import {
  AntennaSignal,
  Clock,
  Link,
  OpenInBrowser,
  QrCode,
} from "iconoir-react";
import { Skeleton } from "./ui/skeleton";
import LinkWithIcon from "./ui/link-with-icon";
import { makeShortLink } from "@/lib/config";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogBody,
} from "./ui/base-dialog";
import { Button } from "./ui/button";
import { QrCodeIcon } from "lucide-react";

export default function MetadataCard({
  shortslug,
  creationTime,
  trackingEnabled,
  fullurl,
  qrEnabled,
  qrStyle,
}: {
  shortslug?: string | undefined;
  creationTime?: number | undefined;
  trackingEnabled?: boolean | undefined;
  fullurl?: string | undefined;
  qrEnabled?: boolean | undefined;
  qrStyle?: {
    fg?: string;
    bg?: string;
    margin?: number;
    ecc?: "L" | "M" | "Q" | "H";
    logoMode?: "brand" | "custom" | "none";
    logoScale?: number;
    customLogoUrl?: string;
  };
}) {
  const qrTarget = shortslug ? `https://${makeShortLink(shortslug)}` : "";
  const size = 200;
  const fg = qrStyle?.fg ?? "#000000";
  const bg = qrStyle?.bg ?? "#ffffff";
  const ecc = (qrStyle?.ecc ?? "H") as "L" | "M" | "Q" | "H";
  const includeMargin = (qrStyle?.margin ?? 2) > 0;
  const logoMode = (qrStyle?.logoMode ?? "brand") as
    | "brand"
    | "custom"
    | "none";
  const logoScale =
    typeof qrStyle?.logoScale === "number" ? qrStyle.logoScale : 0.18;
  const customLogoUrl = qrStyle?.customLogoUrl ?? "";

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-base font-medium">Metadata</h3>
        <div className="text-muted-foreground mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <OpenInBrowser className="size-4" strokeWidth={1.4} /> Short Link:{" "}
            {shortslug ? (
              <LinkWithIcon
                link={makeShortLink(shortslug)}
                className="text-foreground text-sm font-normal"
                iconClassName="size-3"
                href={`https://${makeShortLink(shortslug)}`}
              />
            ) : (
              <Skeleton className="w-sm" />
            )}
          </div>
          {qrEnabled && shortslug && qrTarget ? (
            <div className="flex items-center gap-2">
              <QrCodeIcon className="size-4" strokeWidth={1.4} /> QR Code:{" "}
              <Dialog>
                <DialogTrigger
                  render={
                    <Button
                      variant="link"
                      className="text-foreground decoration-muted-foreground/50 hover:decoration-foreground h-auto p-0 text-sm font-normal underline underline-offset-4"
                    >
                      Click to view QR Code
                    </Button>
                  }
                ></DialogTrigger>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>QR Code</DialogTitle>
                  </DialogHeader>
                  <DialogBody className="flex flex-col items-center justify-center gap-4 p-6">
                    <div className="relative rounded-lg border bg-white p-4">
                      <QRCodeSVG
                        value={qrTarget}
                        size={size}
                        level={ecc}
                        fgColor={fg}
                        bgColor={bg === "transparent" ? "transparent" : bg}
                        marginSize={includeMargin ? 2 : 0}
                        imageSettings={
                          logoMode === "custom" && customLogoUrl
                            ? {
                                src: customLogoUrl,
                                height: Math.max(
                                  8,
                                  Math.round(size * logoScale),
                                ),
                                width: Math.max(
                                  8,
                                  Math.round(size * logoScale),
                                ),
                                excavate: true,
                                crossOrigin: "anonymous",
                              }
                            : undefined
                        }
                        className="rounded-sm"
                      />
                      {logoMode === "brand" ? (
                        <div
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white"
                          style={{
                            width: Math.max(8, Math.round(size * logoScale)),
                            height: Math.max(8, Math.round(size * logoScale)),
                          }}
                        >
                          <span
                            className="font-doto font-black"
                            style={{
                              fontSize: Math.round(
                                Math.max(8, Math.round(size * logoScale)) * 0.7,
                              ),
                              color: fg,
                              lineHeight: 1,
                            }}
                          >
                            N
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-center text-sm break-all">
                      {qrTarget}
                    </p>
                  </DialogBody>
                </DialogContent>
              </Dialog>
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <Link className="size-4" /> Full Link:{" "}
            {fullurl ? (
              <code className="max-w-xs truncate">{fullurl}</code>
            ) : (
              <Skeleton className="w-sm" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="size-4" /> Created:{" "}
            {creationTime ? (
              formatRelative(creationTime || 0)
            ) : (
              <Skeleton className="w-24" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <AntennaSignal className="size-4" />
            Tracking:{" "}
            {trackingEnabled === undefined ? (
              <Skeleton className="w-24" />
            ) : trackingEnabled ? (
              "Enabled"
            ) : (
              "Disabled"
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

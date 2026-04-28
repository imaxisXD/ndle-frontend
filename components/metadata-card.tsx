"use client";

import { formatRelative } from "@/lib/utils";
import { Card, CardContent } from "./ui/card";
import { AntennaSignal, Clock, Link, OpenInBrowser } from "iconoir-react";
import { Skeleton } from "./ui/skeleton";
import LinkWithIcon from "./ui/link-with-icon";
import { makeShortLinkWithDomain } from "@/lib/config";
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
import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr";
import {
  type QrStyle,
  getQrMarginSize,
  getQrOverlaySize,
  getQrOverlaySrc,
  normalizeQrStyle,
} from "@/lib/qr";

export default function MetadataCard({
  shortslug,
  creationTime,
  trackingEnabled,
  fullurl,
  qrEnabled,
  qrStyle,
  customDomain,
}: {
  shortslug?: string | undefined;
  creationTime?: number | undefined;
  trackingEnabled?: boolean | undefined;
  fullurl?: string | undefined;
  qrEnabled?: boolean | undefined;
  qrStyle?: Partial<QrStyle>;
  customDomain?: string | null;
}) {
  const shortLink = shortslug
    ? makeShortLinkWithDomain(shortslug, customDomain)
    : "";
  const qrTarget = shortLink ? `https://${shortLink}` : "";
  const displayStyle = {
    ...normalizeQrStyle(qrStyle),
    size: 200,
  };
  const overlaySrc = getQrOverlaySrc(displayStyle);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-base font-medium">Metadata</h3>
        <div className="text-muted-foreground mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <OpenInBrowser className="size-4" strokeWidth={1.4} /> Short Link:{" "}
            {shortslug ? (
              <LinkWithIcon
                link={shortLink}
                className="text-foreground text-sm font-normal"
                iconClassName="size-3"
                href={`https://${shortLink}`}
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
                        size={displayStyle.size}
                        level={displayStyle.ecc}
                        fgColor={displayStyle.fg}
                        bgColor={displayStyle.bg}
                        marginSize={getQrMarginSize(displayStyle)}
                        imageSettings={
                          overlaySrc
                            ? {
                                src: overlaySrc,
                                height: getQrOverlaySize(displayStyle),
                                width: getQrOverlaySize(displayStyle),
                                excavate: true,
                                crossOrigin: overlaySrc.startsWith("data:")
                                  ? undefined
                                  : "anonymous",
                              }
                            : undefined
                        }
                        className="rounded-sm"
                      />
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

import { formatRelative } from "@/lib/utils";
import { Card, CardContent } from "./ui/card";
import { AntennaSignal, Clock, Link, OpenInBrowser } from "iconoir-react";
import { Skeleton } from "./ui/skeleton";
import LinkWithIcon from "./ui/link-with-icon";
import { makeShortLink } from "@/lib/config";

export default function MetadataCard({
  shortslug,
  creationTime,
  trackingEnabled,
  fullurl,
}: {
  shortslug?: string | undefined;
  creationTime?: number | undefined;
  trackingEnabled?: boolean | undefined;
  fullurl?: string | undefined;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-base font-medium">Metadata</h3>
        <div className="text-muted-foreground mt-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <OpenInBrowser className="size-4" /> Short URL:{" "}
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
          <div className="flex items-center gap-2">
            <Link className="size-4" /> Full URL:{" "}
            {fullurl ? (
              <code className="max-w-md truncate">{fullurl}</code>
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

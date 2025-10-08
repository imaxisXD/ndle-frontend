import { Copy, OpenNewWindow } from "iconoir-react";

import type { DisplayUrl } from "./types";

export function ShortUrlCell({
  url,
  onCopy,
}: {
  url: DisplayUrl;
  onCopy: (shortUrl: string) => void;
}) {
  const normalizedHref = url.shortUrl.startsWith("http")
    ? url.shortUrl
    : `https://${url.shortUrl}`;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <code className="text-foreground text-sm font-medium">
          {url.shortUrl}
        </code>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(url.shortUrl);
          }}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
        <a
          href={normalizedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <OpenNewWindow className="size-3.5" />
        </a>
      </div>
      <p className="text-muted-foreground max-w-[520px] truncate text-xs">
        {url.originalUrl}
      </p>
    </div>
  );
}

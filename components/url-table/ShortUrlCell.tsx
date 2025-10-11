import { Copy, OpenNewWindow } from "iconoir-react";

import type { DisplayUrl } from "./types";
import { Button } from "../ui/button";

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
      <div className="flex items-center justify-start gap-1">
        <a
          href={normalizedHref}
          target="_blank"
          rel="noopener noreferrer"
          className="group text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1 rounded-md pr-1 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <code className="text-foreground text-sm font-medium group-hover:underline group-hover:decoration-blue-500 group-hover:decoration-dashed group-hover:underline-offset-2">
            {url.shortUrl}
          </code>
          <OpenNewWindow
            className="size-3 group-hover:text-blue-600"
            strokeWidth={2.4}
          />
        </a>
        <Button
          size="icon"
          variant="link"
          type="button"
          className="text-muted-foreground hover:bg-muted flex items-center justify-center rounded-md p-1 transition-colors hover:text-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(url.shortUrl);
          }}
        >
          <Copy className="size-4" strokeWidth={1.8} />
        </Button>
      </div>
      <p className="text-muted-foreground max-w-[520px] truncate text-xs">
        {url.originalUrl}
      </p>
    </div>
  );
}

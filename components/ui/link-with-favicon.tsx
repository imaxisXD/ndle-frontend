import * as React from "react";
import { cn } from "@/lib/utils";
import { UrlFavicon } from "../url-favicon";
import LinkWithIcon from "./link-with-icon";

export interface LinkWithFaviconProps extends Omit<
  React.ComponentProps<typeof LinkWithIcon>,
  "link" | "href"
> {
  url: string;
  originalUrl: string;
  showFavicon?: boolean;
  /** Extra classes for the favicon slot, e.g. to hide it on small screens. */
  faviconClassName?: string;
  showIcon?: boolean;
  asCode?: boolean;
  children?: React.ReactNode;
  size?: "sm" | "md";
}

const LinkWithFavicon = React.forwardRef<
  HTMLAnchorElement,
  LinkWithFaviconProps
>(
  (
    {
      url,
      originalUrl,
      showFavicon = true,
      faviconClassName,
      showIcon = true,
      asCode = false,
      className,
      iconClassName,
      children,
      size = "md",
      ...props
    },
    ref,
  ) => {
    const TextWrapper = asCode ? "code" : "span";
    const displayText = children || url.replace(/^https?:\/\//, "");

    return (
      <div className="flex min-w-0 items-center gap-0.5">
        {showFavicon && (
          <span className={cn("contents", faviconClassName)}>
            <UrlFavicon url={originalUrl} size={size} />
          </span>
        )}
        <LinkWithIcon
          ref={ref}
          href={url}
          link={
            <TextWrapper
              className={cn(
                "min-w-0 truncate",
                asCode && "text-foreground text-sm font-medium",
              )}
            >
              {displayText}
            </TextWrapper>
          }
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground min-w-0 justify-start rounded-md px-2 py-1 text-sm font-medium transition-colors hover:decoration-blue-500 hover:decoration-dashed hover:underline-offset-2",
            className,
          )}
          iconClassName={cn(
            "size-3 shrink-0",
            !showIcon && "hidden",
            iconClassName,
          )}
          {...props}
        />
      </div>
    );
  },
);

LinkWithFavicon.displayName = "LinkWithFavicon";

export { LinkWithFavicon };

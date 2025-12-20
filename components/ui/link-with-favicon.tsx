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
      <div className="flex items-center gap-0.5">
        {showFavicon && <UrlFavicon url={originalUrl} size={size} />}
        <LinkWithIcon
          ref={ref}
          href={url}
          link={
            <TextWrapper
              className={cn(
                asCode && "text-foreground truncate text-sm font-medium",
              )}
            >
              {displayText}
            </TextWrapper>
          }
          className={cn(
            "text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-2 py-1 text-sm font-medium transition-colors hover:decoration-blue-500 hover:decoration-dashed hover:underline-offset-2",
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

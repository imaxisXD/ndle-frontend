import * as React from "react";
import { cn } from "@/lib/utils";
import { OpenNewWindow } from "iconoir-react";

interface LinkWithIconProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  link: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

const LinkWithIcon = React.forwardRef<HTMLAnchorElement, LinkWithIconProps>(
  ({ link, className, iconClassName, href, ...props }, ref) => {
    return (
      <a
        ref={ref}
        href={href}
        target="_blank"
        rel="noopener"
        className={cn(
          "group text-primary pointer-events-auto flex items-center justify-center gap-1.5 text-3xl font-medium tracking-tight transition-all duration-150 ease-linear hover:underline hover:decoration-blue-600 hover:decoration-dashed hover:underline-offset-4",
          className,
        )}
        {...props}
      >
        {link}

        <OpenNewWindow
          className={cn(
            "text-muted-foreground size-2 group-hover:text-blue-600",
            iconClassName,
          )}
          strokeWidth={2}
        />
      </a>
    );
  },
);

LinkWithIcon.displayName = "LinkWithIcon";

export default LinkWithIcon;

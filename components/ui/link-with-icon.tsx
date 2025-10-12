import { cn } from "@/lib/utils";
import { OpenNewWindow } from "iconoir-react";

export default function LinkWithIcon({
  link,
  className,
  iconClassName,
  href,
}: {
  href: string;
  link: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group text-primary pointer-events-auto flex items-center justify-center gap-1.5 text-3xl font-medium tracking-tight transition-all duration-150 ease-linear hover:underline hover:decoration-blue-600 hover:decoration-dashed hover:underline-offset-4",
        className,
      )}
    >
      {link}

      <OpenNewWindow
        className={cn(
          "text-muted-foreground size-4 group-hover:text-blue-600",
          iconClassName,
        )}
        strokeWidth={2}
      />
    </a>
  );
}

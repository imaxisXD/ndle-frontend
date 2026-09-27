import * as React from "react";
import { cn } from "@/lib/utils";

// A section set into a raised surface: stat tiles, wells, filter panels. The
// fill is translucent (see --surface-inset), so it reads a step darker than
// whatever white panel, popover, or dialog it sits in. For a tray on the page
// itself, use Card's accent variant; for a raised white panel, use Card.
function Inset({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="inset"
      className={cn(
        "bg-surface-inset border-border rounded-md border",
        className,
      )}
      {...props}
    />
  );
}

export { Inset };

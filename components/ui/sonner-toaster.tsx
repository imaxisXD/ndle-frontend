"use client";

import { Toaster as SonnerToaster } from "sonner";
import { CircleGridLoaderIcon } from "../icons";

/**
 * Custom Sonner Toaster component styled to match the existing Base UI toast design.
 * Features:
 * - Bottom-right positioning
 * - Gradient background with colored outlines based on toast type
 * - Custom icons (loading spinner, colored pills for status)
 * - Close button and swipe-to-dismiss support
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={false}
      visibleToasts={5}
      closeButton
      gap={8}
      icons={{
        loading: <CircleGridLoaderIcon className="size-3" />,
        success: <div className="h-4 w-1.5 rounded-full bg-green-600" />,
        error: <div className="h-4 w-1.5 rounded-full bg-red-500" />,
        info: <div className="h-4 w-1.5 rounded-full bg-blue-500" />,
        warning: <div className="h-4 w-1.5 rounded-full bg-amber-400" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group w-full sm:w-96 p-2.5 rounded-md bg-gradient-to-t from-background to-popover border border-border shadow-lg text-popover-foreground",
          title: "text-sm font-medium tracking-tight",
          description: "text-muted-foreground text-xs tracking-tight mt-1",
          actionButton:
            "bg-foreground text-background text-xs rounded px-2 py-1",
          cancelButton:
            "bg-muted text-muted-foreground text-xs rounded px-2 py-1",
          closeButton:
            "!left-auto !right-0 !top-0 !translate-x-1/2 !-translate-y-1/2 !bg-gradient-to-t !from-black !to-black/60 !text-white !border-0 !rounded-full !p-1 [&_svg]:!size-3 [&_svg]:!opacity-70 hover:[&_svg]:!opacity-100",
          icon: "mr-2",
          success: "!border-green-600",
          error: "!border-destructive",
          info: "!border-blue-500",
          warning: "!border-yellow-500",
        },
      }}
    />
  );
}

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";

// Variants for TabsList
const tabsListVariants = cva("flex items-center shrink-0", {
  variants: {
    variant: {
      // `relative` anchors the sliding TabsIndicator (default variant only).
      default: "relative bg-accent p-1",
      button: "",
      line: "border-b border-border",
    },
    shape: {
      default: "",
      pill: "",
    },
    size: {
      lg: "gap-2.5",
      md: "gap-2",
      sm: "gap-1.5",
      xs: "gap-1",
    },
  },
  compoundVariants: [
    { variant: "default", size: "lg", className: "p-1.5 gap-2.5" },
    { variant: "default", size: "md", className: "p-1 gap-2" },
    { variant: "default", size: "sm", className: "p-1 gap-1.5" },
    { variant: "default", size: "xs", className: "p-1 gap-1" },

    {
      variant: "default",
      shape: "default",
      size: "lg",
      className: "rounded-lg",
    },
    {
      variant: "default",
      shape: "default",
      size: "md",
      className: "rounded-lg",
    },
    {
      variant: "default",
      shape: "default",
      size: "sm",
      className: "rounded-md",
    },
    {
      variant: "default",
      shape: "default",
      size: "xs",
      className: "rounded-md",
    },

    { variant: "line", size: "lg", className: "gap-9" },
    { variant: "line", size: "md", className: "gap-8" },
    { variant: "line", size: "sm", className: "gap-4" },
    { variant: "line", size: "xs", className: "gap-4" },

    {
      variant: "default",
      shape: "pill",
      className: "rounded-full [&_[role=tab]]:rounded-full",
    },
    {
      variant: "button",
      shape: "pill",
      className: "rounded-full [&_[role=tab]]:rounded-full",
    },
  ],
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

// Variants for TabsTrigger
const tabsTriggerVariants = cva(
  "shrink-0 cursor-pointer whitespace-nowrap inline-flex justify-center items-center font-medium ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&:hover_svg]:text-primary [&[aria-selected=true]_svg]:text-primary [&[data-selected]_svg]:text-primary",
  {
    variants: {
      variant: {
        // The active-pill background lives on <TabsIndicator> for this variant
        // (see TabsList) so only one filled pill shows; the trigger keeps just
        // the text-color change. `relative z-[1]` lifts labels above the pill.
        default:
          "relative z-[1] text-muted-foreground hover:text-foreground aria-selected:text-foreground data-[selected]:text-foreground",
        button:
          "focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-lg text-accent-foreground hover:text-foreground aria-selected:bg-accent aria-selected:text-foreground data-[selected]:bg-accent data-[selected]:text-foreground",
        line: "border-b-2 text-muted-foreground border-transparent hover:text-primary aria-selected:border-primary aria-selected:text-primary data-[selected]:border-primary data-[selected]:text-primary",
      },
      size: {
        lg: "gap-2.5 [&_svg]:size-5 text-sm",
        md: "gap-2 [&_svg]:size-4 text-sm",
        sm: "gap-1.5 [&_svg]:size-3.5 text-xs",
        xs: "gap-1 [&_svg]:size-3.5 text-xs",
      },
    },
    compoundVariants: [
      { variant: "default", size: "lg", className: "py-2.5 px-4 rounded-md" },
      { variant: "default", size: "md", className: "py-1.5 px-3 rounded-md" },
      { variant: "default", size: "sm", className: "py-1.5 px-2.5 rounded-sm" },
      { variant: "default", size: "xs", className: "py-1 px-2 rounded-sm" },

      { variant: "button", size: "lg", className: "py-3 px-4 rounded-lg" },
      { variant: "button", size: "md", className: "py-2.5 px-3 rounded-lg" },
      { variant: "button", size: "sm", className: "py-2 px-2.5 rounded-md" },
      { variant: "button", size: "xs", className: "py-1.5 px-2 rounded-md" },

      { variant: "line", size: "lg", className: "py-3" },
      { variant: "line", size: "md", className: "py-2.5" },
      { variant: "line", size: "sm", className: "py-2" },
      { variant: "line", size: "xs", className: "py-1.5" },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

// Variants for the sliding active-pill indicator (default variant only).
// Positioned/sized from Base UI's --active-tab-* CSS vars. The radius mirrors
// the trigger radius per size so the pill matches the active tab shape.
const tabsIndicatorVariants = cva(
  cn(
    "pointer-events-none absolute top-0 left-0 z-0",
    // Move with `translate` (GPU-friendly) and size from Base UI's --active-tab-*
    // vars, so the pill tracks the active tab's box within the list padding.
    "translate-x-[var(--active-tab-left)] translate-y-[var(--active-tab-top)]",
    "h-[var(--active-tab-height)] w-[var(--active-tab-width)]",
    // The filled pill that previously lived on the active trigger.
    "bg-background shadow-xs shadow-black/5",
    // Tween position + size with the shared motion tokens.
    "transition-[translate,width,height] [transition-duration:var(--duration-fast)] [transition-timing-function:var(--ease-smooth-out)]",
    // No first-paint flash: Base UI sets data-activation-direction="none" until
    // a user actually switches tabs, so the initial snap runs without a tween.
    "data-[activation-direction=none]:transition-none",
    "motion-reduce:transition-none",
  ),
  {
    variants: {
      shape: {
        default: "",
        pill: "rounded-full",
      },
      size: {
        lg: "rounded-md",
        md: "rounded-md",
        sm: "rounded-sm",
        xs: "rounded-sm",
      },
    },
    compoundVariants: [
      { shape: "pill", size: "lg", className: "rounded-full" },
      { shape: "pill", size: "md", className: "rounded-full" },
      { shape: "pill", size: "sm", className: "rounded-full" },
      { shape: "pill", size: "xs", className: "rounded-full" },
    ],
    defaultVariants: {
      shape: "default",
      size: "md",
    },
  },
);

// Variants for TabsContent
const tabsContentVariants = cva(
  "mt-2.5 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Context
type TabsContextType = {
  variant?: "default" | "button" | "line";
  shape?: "default" | "pill";
  size?: "lg" | "sm" | "xs" | "md";
};
const TabsContext = React.createContext<TabsContextType>({
  variant: "default",
  shape: "default",
  size: "md",
});

// Components
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Root>) {
  return (
    <BaseTabs.Root data-slot="tabs" className={cn("", className)} {...props} />
  );
}

function TabsList({
  className,
  variant = "default",
  shape = "default",
  size = "md",
  children,
  ...props
}: React.ComponentProps<typeof BaseTabs.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsContext.Provider
      value={{
        variant: variant || "default",
        shape: shape || "default",
        size: size || "md",
      }}
    >
      <BaseTabs.List
        data-slot="tabs-list"
        className={cn(tabsListVariants({ variant, shape, size }), className)}
        {...props}
      >
        {/* Sliding active pill — segmented (default) variant only. Base UI's
            Indicator measures the active tab and exposes --active-tab-* vars on
            itself; tabsIndicatorVariants positions, sizes, and fills it. */}
        {variant === "default" ? (
          <BaseTabs.Indicator
            data-slot="tabs-indicator"
            className={cn(
              tabsIndicatorVariants({
                shape: shape || "default",
                size: size || "md",
              }),
            )}
          />
        ) : null}
        {children}
      </BaseTabs.List>
    </TabsContext.Provider>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseTabs.Tab>) {
  const { variant, size } = React.useContext(TabsContext);

  return (
    <BaseTabs.Tab
      data-slot="tabs-trigger"
      className={cn(tabsTriggerVariants({ variant, size }), className)}
      {...props}
    />
  );
}

function TabsContent({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof BaseTabs.Panel> &
  VariantProps<typeof tabsContentVariants>) {
  return (
    <BaseTabs.Panel
      data-slot="tabs-content"
      className={cn(tabsContentVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };

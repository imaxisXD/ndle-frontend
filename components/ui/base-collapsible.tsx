"use client";

import React, { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import { Collapsible as BaseCollapsible } from "@base-ui-components/react/collapsible";
import { AnimatePresence, motion } from "motion/react";

const CollapsibleContext = createContext<{ open: boolean } | null>(null);

type CollapsibleRootProps = React.ComponentProps<typeof BaseCollapsible.Root>;
type BaseOnOpenChange = NonNullable<CollapsibleRootProps["onOpenChange"]>;

function Collapsible({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultOpen = false,
  children,
  ...props
}: CollapsibleRootProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback<BaseOnOpenChange>(
    (nextOpen, eventDetails) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      controlledOnOpenChange?.(nextOpen, eventDetails);
    },
    [isControlled, controlledOnOpenChange],
  );

  return (
    <CollapsibleContext.Provider value={{ open }}>
      <BaseCollapsible.Root
        data-slot="collapsible"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      >
        {children}
      </BaseCollapsible.Root>
    </CollapsibleContext.Provider>
  );
}

function CollapsibleTrigger({
  children,
  className,
  asChild = false,
  ...props
}: React.ComponentProps<typeof BaseCollapsible.Trigger> & {
  asChild?: boolean;
}) {
  const triggerProps = {
    "data-slot": "collapsible-trigger" as const,
    className,
    ...props,
    ...(asChild && {
      render: children as React.ReactElement<
        Record<string, unknown>,
        string | React.JSXElementConstructor<unknown>
      >,
    }),
  };

  return asChild ? (
    <BaseCollapsible.Trigger {...triggerProps} />
  ) : (
    <BaseCollapsible.Trigger {...triggerProps}>
      {children}
    </BaseCollapsible.Trigger>
  );
}

function CollapsiblePanel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseCollapsible.Panel>) {
  const context = useContext(CollapsibleContext);
  const isOpen = context?.open ?? false;

  return (
    <BaseCollapsible.Panel data-slot="collapsible-panel" keepMounted {...props}>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={cn("overflow-hidden", className)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </BaseCollapsible.Panel>
  );
}

export { Collapsible, CollapsiblePanel, CollapsibleTrigger };

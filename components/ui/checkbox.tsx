"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { Check, Minus } from "iconoir-react";

// Define the variants for the Checkbox using cva.
const checkboxVariants = cva(
  `
    group peer bg-white shrink-0 rounded-[3.5px] border border-checkbox-border ring-offset-background focus-visible:outline-none 
    focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 
    aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10 aria-invalid:border-destructive aria-invalid:ring-destructive/20
    [[data-invalid=true]_&]:border-destructive/60 [[data-invalid=true]_&]:ring-destructive/10 [[data-invalid=true]_&]:border-destructive [[data-invalid=true]_&]:ring-destructive/20,
    data-[state=checked]:bg-accent/80 data-[state=checked]:border-primary data-[state=checked]:text-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:text-primary-foreground
    `,
  {
    variants: {
      size: {
        sm: "size-3.5 [&_svg]:size-2.5",
        md: "size-5 [&_svg]:size-3.5",
        lg: "size-5.5 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);

function Checkbox({
  className,
  size,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof checkboxVariants>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(checkboxVariants({ size }), className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn("flex items-center justify-center text-current")}
      >
        <Check
          className="group-data-[state=indeterminate]:hidden"
          strokeWidth={3.5}
        />
        <Minus className="hidden group-data-[state=indeterminate]:block" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };

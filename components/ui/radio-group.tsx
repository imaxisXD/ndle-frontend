"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
// "Dot" will be rendered via CSS for precise centering across DPIs

type RadioVariant = "primary" | "mono";
type RadioSize = "sm" | "md" | "lg";

// Define a cva function for the RadioGroup root.
const radioGroupVariants = cva("grid gap-2.5", {
  variants: {
    variant: {
      primary: "",
      mono: "",
    },
    size: {
      sm: "",
      md: "",
      lg: "",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

// Create a context to pass the variant and size down to items.
const RadioGroupContext = React.createContext<{
  variant: RadioVariant;
  size: RadioSize;
}>({ variant: "primary", size: "md" });

function RadioGroup({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root> &
  VariantProps<typeof radioGroupVariants>) {
  return (
    <RadioGroupContext.Provider
      value={{ variant: variant ?? "primary", size: size ?? "md" }}
    >
      <RadioGroupPrimitive.Root
        data-slot="radio-group"
        className={cn(radioGroupVariants({ variant, size }), className)}
        {...props}
      />
    </RadioGroupContext.Provider>
  );
}

// Define variants for the RadioGroupItem using cva.
const radioItemVariants = cva(
  `
    peer aspect-square rounded-full border outline-hidden ring-offset-background focus:outline-none focus-visible:ring-2 
    focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
    aria-invalid:border-destructive/60 aria-invalid:ring-destructive/10 aria-invalid:border-destructive aria-invalid:ring-destructive/20
    [[data-invalid=true]_&]:border-destructive/60 [[data-invalid=true]_&]:ring-destructive/10 [[data-invalid=true]_&]:border-destructive [[data-invalid=true]_&]:ring-destructive/20
    border-checkbox-border text-primary 
    hover:border-primary/50 hover:bg-accent/20
    data-[state=checked]:outline data-[state=checked]:outline-2 data-[state=checked]:outline-offset-2 data-[state=checked]:outline-ring/50
    data-[state=checked]:bg-accent/80 data-[state=checked]:border-primary/60 data-[state=checked]:text-primary/80
    transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.90] cursor-pointer
  `,
  {
    variants: {
      size: {
        sm: "size-3.5 [&_svg]:size-1.75",
        md: "size-5 [&_svg]:size-2.5",
        lg: "size-5.5 [&_svg]:size-3",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

function RadioGroupItem({
  className,
  size,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> &
  VariantProps<typeof radioItemVariants>) {
  // Use the variant and size from context if not provided at the item level.
  const { size: contextSize } = React.useContext(RadioGroupContext);
  const effectiveSize = size ?? contextSize;
  const dotSizeClass =
    effectiveSize === "sm"
      ? "size-2"
      : effectiveSize === "md"
        ? "size-2.5"
        : "size-3";

  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(radioItemVariants({ size: effectiveSize }), className)}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center"
      >
        <div className={cn("rounded-full bg-current", dotSizeClass)} />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-secondary text-secondary-foreground border-transparent py-1",
        green: "bg-green-100 text-green-700 border-green-500/70",
        yellow: "bg-yellow-100 text-yellow-700 border-yellow-500/70",
        red: "bg-red-100 text-red-700 border-red-500/70",
        blue: "bg-blue-100 text-blue-600 border-blue-500/70",
        primary: "bg-accent text-primary border-accent font-medium",
      },
    },
    defaultVariants: {
      variant: "green",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  label?: React.ReactNode;
}

function Badge({ className, variant, label, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {label ?? children}
    </span>
  );
}

export { Badge, badgeVariants };

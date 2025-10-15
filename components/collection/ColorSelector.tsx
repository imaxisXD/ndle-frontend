"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { COLLECTION_COLORS } from "./colors";
import { Shuffle } from "iconoir-react";

type Props = {
  value?: string;
  onChange: (color: string) => void;
  colors?: readonly string[];
  className?: string;
};

export function ColorSelector({
  value,
  onChange,
  colors = COLLECTION_COLORS,
  className,
}: Props) {
  return (
    <div
      role="group"
      aria-label="Color choices"
      className={cn("flex flex-wrap gap-3", className)}
    >
      <button
        type="button"
        aria-label="Select random color"
        aria-pressed={!value}
        onClick={() => onChange("")}
        className={cn(
          "inline-flex items-center justify-center rounded-full outline-hidden",
          "aspect-square size-7 p-0",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
          !value && "ring-accent ring-offset-background ring-2 ring-offset-2",
        )}
      >
        <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-black">
          <Shuffle className="size-4" />
        </span>
      </button>

      {colors.map((color) => {
        const selected = value === color;
        return (
          <button
            key={color}
            type="button"
            aria-label={`Select ${color}`}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={cn(
              "inline-flex items-center justify-center rounded-full outline-hidden",
              "aspect-square size-7 p-0", // ensure perfect circle for ring
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
              selected &&
                "ring-accent ring-offset-background ring-2 ring-offset-2",
            )}
          >
            <span
              className="block size-6 rounded-full border"
              style={{ backgroundColor: `${color}20`, borderColor: color }}
            />
          </button>
        );
      })}
    </div>
  );
}

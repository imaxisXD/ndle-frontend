"use client";

import { cn } from "@/lib/utils";
import { COLLECTION_COLORS } from "./colors";
import { Shuffle } from "iconoir-react";

type Props = {
  value?: string;
  onChange: (color: string) => void;
  colors?: readonly string[];
  className?: string;
  showTransparentOption?: boolean;
};

export function ColorSelector({
  value,
  onChange,
  colors = COLLECTION_COLORS,
  className,
  showTransparentOption = false,
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
        aria-pressed={!value || (value !== "transparent" && !colors.includes(value as any))}
        onClick={() => onChange("")}
        className={cn(
          "inline-flex items-center justify-center rounded-full outline-hidden transition-transform hover:scale-110 active:scale-95",
          "aspect-square size-7 p-0",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
          (!value || (value !== "transparent" && !colors.includes(value as any))) && 
            "ring-accent ring-offset-background ring-2 ring-offset-2",
        )}
      >
        <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-black">
          <Shuffle className="size-4" />
        </span>
      </button>

      {showTransparentOption && (
        <button
          type="button"
          aria-label="Select Transparent Background"
          aria-pressed={value === "transparent"}
          onClick={() => onChange("transparent")}
          className={cn(
            "inline-flex items-center justify-center rounded-full outline-hidden transition-transform hover:scale-110 active:scale-95",
            "aspect-square size-7 p-0",
            "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2",
            value === "transparent" && "ring-accent ring-offset-background ring-2 ring-offset-2"
          )}
        >
          <span className="border-border flex size-6 items-center justify-center overflow-hidden rounded-full border bg-white">
            {/* Checkerboard pattern for transparent representation */}
            <div className="h-full w-full bg-[linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc),linear-gradient(45deg,#ccc_25%,transparent_25%,transparent_75%,#ccc_75%,#ccc)] bg-[length:6px_6px] bg-[position:0_0,3px_3px] opacity-40" />
          </span>
        </button>
      )}

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
              "inline-flex items-center justify-center rounded-full outline-hidden transition-transform hover:scale-110 active:scale-95",
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

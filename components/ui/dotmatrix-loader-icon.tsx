"use client";

import {
  DotmSquare9,
  type DotmSquare9Props,
} from "@/components/ui/dotm-square-9";

type DotmatrixLoaderIconProps = Omit<
  DotmSquare9Props,
  | "animated"
  | "cellPadding"
  | "colorPreset"
  | "dotShape"
  | "dotSize"
  | "opacityBase"
  | "opacityMid"
  | "opacityPeak"
  | "pattern"
  | "size"
> & {
  size?: number;
  dotSize?: number;
  cellPadding?: number;
  title?: string;
};

function defaultDotSize(size: number) {
  if (size <= 12) {
    return 2;
  }
  if (size <= 24) {
    return 4;
  }
  return Math.max(2, Math.round(size / 7));
}

function defaultCellPadding(size: number, dotSize: number) {
  return Math.max(0, (size - dotSize * 5) / 4);
}

export function DotmatrixLoaderIcon({
  size = 42,
  dotSize = defaultDotSize(size),
  cellPadding = defaultCellPadding(size, dotSize),
  speed = 1.5,
  title,
  ariaLabel,
  ...props
}: DotmatrixLoaderIconProps) {
  return (
    <DotmSquare9
      {...props}
      ariaLabel={ariaLabel ?? title ?? "Loading"}
      size={size}
      dotSize={dotSize}
      speed={speed}
      pattern="full"
      dotShape="square"
      colorPreset="grad-sunset"
      animated
      cellPadding={cellPadding}
      opacityBase={0.02}
      opacityMid={0.43}
      opacityPeak={1}
    />
  );
}

"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import "@/components/dotmatrix-loader.css";

type DotmatrixLoaderIconProps = {
  size?: number;
  dotSize?: number;
  cellPadding?: number;
  speed?: number;
  title?: string;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
};

const SUNSET_FILL =
  "linear-gradient(135deg, #ff5f6d 0%, #ffc371 52%, #ffe29a 100%)";

const D1 = 0x01;
const D2 = 0x02;
const D3 = 0x04;
const D4 = 0x08;
const D5 = 0x10;
const D6 = 0x20;

const BIT_CLASS: Record<number, string> = {
  [D1]: "dmx-square9-d1",
  [D2]: "dmx-square9-d2",
  [D3]: "dmx-square9-d3",
  [D4]: "dmx-square9-d4",
  [D5]: "dmx-square9-d5",
  [D6]: "dmx-square9-d6",
};

function resolveBrailleBit(row: number, col: number): number | null {
  if (row < 1 || row > 3) return null;
  const dr = row - 1;
  if (col === 0 || col === 3) return D1 << dr;
  if (col === 1 || col === 4) return D4 << dr;
  return null;
}

const CELLS = Array.from({ length: 25 }, (_, index) => {
  const row = Math.floor(index / 5);
  const col = index % 5;
  const bit = resolveBrailleBit(row, col);
  const isGap = row >= 1 && row <= 3 && col === 2;
  return { key: `${row}-${col}`, bit, isGap };
});

function defaultDotSize(size: number) {
  if (size <= 12) return 2;
  if (size <= 24) return 4;
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
  className,
  style,
}: DotmatrixLoaderIconProps) {
  const label = ariaLabel ?? title ?? "Loading";
  const speedScale = speed > 0 ? 1 / speed : 1;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn("dmx-root", className)}
      style={
        {
          width: size,
          height: size,
          "--dmx-speed": speedScale,
          "--dmx-dot-fill": SUNSET_FILL,
          ...style,
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="dmx-grid"
        style={{ gap: `${cellPadding}px` }}
      >
        {CELLS.map(({ key, bit, isGap }) => (
          <span
            key={key}
            className={cn(
              "dmx-dot",
              bit !== null && `dmx-square9-bit ${BIT_CLASS[bit]}`,
            )}
            style={{
              width: dotSize,
              height: dotSize,
              ...(bit === null ? { opacity: isGap ? 0.12 : 0.08 } : undefined),
            }}
          />
        ))}
      </span>
    </span>
  );
}

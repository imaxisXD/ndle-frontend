"use client";

import { type CSSProperties, useMemo, useState } from "react";
import type { QrEcc } from "@/lib/qr";
import {
  finderShapes,
  layoutQr,
  QR_DOT_RADIUS,
  type QrLogo,
} from "@/lib/qr-code";

// The refresh sweeps the code top to bottom like ndle's dot-matrix sign: a
// row's dots update as the scan reaches it, give or take a little scatter so
// the edge of the scan isn't a hard line.
const SCAN_MS = 360;
const SCATTER_MS = 90;

function delayFor(x: number, y: number, modules: number) {
  const scatter = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000;
  return Math.round((y / modules) * SCAN_MS + scatter * SCATTER_MS);
}

function delayStyle(delay: number) {
  return { "--qr-delay": `${delay}ms` } as CSSProperties;
}

export type QrCodeProps = {
  value: string;
  /** Width and height in px. */
  size: number;
  fg?: string;
  /** A colour, or "transparent". */
  bg?: string;
  ecc?: QrEcc;
  /** Quiet zone around the code, in modules. */
  margin?: number;
  logo?: QrLogo;
  /** What the code is for, read out by screen readers. */
  title?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * ndle's QR code: dots, rounded finders, optional logo. Whenever what it
 * encodes or how it looks changes, a scan sweeps down the code and refreshes
 * it dot by dot: dots that go dark pop in, dots that go light shrink away,
 * colours change as the scan passes, and every dot flickers once like an LED
 * board redrawing. The look and the downloads come from lib/qr-code.ts.
 */
export function QrCode({
  value,
  size,
  fg = "#000000",
  bg = "#ffffff",
  ecc = "H",
  margin = 2,
  logo,
  title,
  className,
  style,
}: QrCodeProps) {
  const logoHref = logo?.href;
  const logoSize = logo?.size;
  const logoBackdrop = logo?.backdrop;
  const layout = useMemo(
    () =>
      layoutQr(value, {
        size,
        ecc,
        margin,
        logo:
          logoHref && logoSize
            ? { href: logoHref, size: logoSize, backdrop: logoBackdrop }
            : undefined,
      }),
    [value, size, ecc, margin, logoHref, logoSize, logoBackdrop],
  );
  const { modules } = layout;

  // Count each change so the scan's flicker can restart: it alternates
  // between two identical keyframes, since re-setting the same animation
  // wouldn't replay it. No flicker on first paint.
  const signature = [value, fg, bg, ecc, margin, logoHref, logoSize].join("|");
  const [scan, setScan] = useState({ signature, count: 0 });
  if (scan.signature !== signature) {
    setScan({ signature, count: scan.count + 1 });
  }

  return (
    <svg
      role="img"
      aria-label={title ?? `QR code for ${value}`}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      data-scan={scan.count === 0 ? undefined : scan.count % 2}
      className={className}
      style={style}
    >
      {bg !== "transparent" && (
        <rect className="qr-paper" width={modules} height={modules} fill={bg} />
      )}

      {layout.finders.map(({ x, y }) => {
        const { ring, eye } = finderShapes(x, y);
        return (
          <g
            key={`${x}:${y}`}
            style={delayStyle(delayFor(x + 3, y + 3, modules))}
          >
            <rect
              className="qr-finder"
              x={ring.x}
              y={ring.y}
              width={ring.side}
              height={ring.side}
              rx={ring.radius}
              fill="none"
              stroke={fg}
              strokeWidth={1}
            />
            <rect
              className="qr-finder"
              x={eye.x}
              y={eye.y}
              width={eye.side}
              height={eye.side}
              rx={eye.radius}
              fill={fg}
            />
          </g>
        );
      })}

      {layout.cells.map(({ x, y, on }) => (
        <circle
          key={`${x}:${y}`}
          className="qr-dot"
          data-on={on || undefined}
          cx={x + 0.5}
          cy={y + 0.5}
          r={QR_DOT_RADIUS}
          fill={fg}
          style={delayStyle(delayFor(x, y, modules))}
        />
      ))}

      {layout.logo && (
        <g>
          {layout.logo.backdrop && (
            <rect
              x={layout.logo.x}
              y={layout.logo.y}
              width={layout.logo.side}
              height={layout.logo.side}
              rx={layout.logo.side / 5}
              fill="#ffffff"
            />
          )}
          <image
            href={layout.logo.href}
            x={layout.logo.x}
            y={layout.logo.y}
            width={layout.logo.side}
            height={layout.logo.side}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      )}
    </svg>
  );
}

/**
 * Doodle icons — hand-drawn social marks for the pulp landing page.
 *
 * Drawn like a felt-tip marker: one weight, round caps, lines that bow a
 * little instead of running straight, and corners that overshoot where a
 * hand would lift the pen. No ghost strokes — those read as smudges at
 * small sizes.
 */

import type { HTMLAttributes, SVGProps } from "react";

type DoodleProps = SVGProps<SVGSVGElement> & { size?: number };

function Frame({ size = 20, children, ...rest }: DoodleProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** X — one fat inked diagonal, one thin one crossing it, like the mark itself. */
export function DoodleX(props: DoodleProps) {
  return (
    <Frame {...props}>
      {/* thick stroke: a wobbly filled sliver, top-left to bottom-right */}
      <path
        d="M4.4 4.6c1-.4 2-.6 3.1-.5 3.9 4.5 8 9.4 12.3 14.6-.9.6-1.9.9-3 1C12.8 15 8.7 10 4.4 4.6Z"
        fill="currentColor"
        stroke="none"
      />
      {/* thin stroke: bottom-left to top-right, bowing slightly */}
      <path d="M4.9 19.4c2.3-2.7 4.6-5.3 7-7.8 2.4-2.6 4.8-5 7.3-7.3" />
    </Frame>
  );
}

/** LinkedIn — a marker-drawn rounded square with "in" lettered inside. */
export function DoodleLinkedIn(props: DoodleProps) {
  return (
    <Frame {...props}>
      {/* frame, started at top-left and overshooting where the pen lifts */}
      <path d="M6.6 4.3c3.8-.2 7.6-.2 11.4 0 .9 0 1.6.7 1.7 1.6.2 4 .2 8 0 12 0 .9-.8 1.7-1.7 1.7-3.9.2-7.8.2-11.7 0-.9 0-1.6-.8-1.6-1.7-.2-4-.2-8 0-12 0-.9.7-1.6 1.6-1.6l1.4 0" />
      {/* i */}
      <path d="M8.4 10.6c.1 2.1.1 4.1 0 6.2" />
      <path d="M8.4 7.6h.1" strokeWidth={2.8} />
      {/* n */}
      <path d="M11.7 10.5c.1 2.1.1 4.2 0 6.3" />
      <path d="M11.8 12.6c.6-1.3 1.6-2.1 2.8-2.1 1.4 0 2.3 1 2.3 2.6.1 1.3 0 2.5-.1 3.8" />
    </Frame>
  );
}

/** GitHub — a doodled octocat head: round face, two ears, dot eyes, small mouth. */
export function DoodleGitHub(props: DoodleProps) {
  return (
    <Frame {...props}>
      {/* one continuous outline: left ear, top of head, right ear, then around */}
      <path d="M7.6 6.9 6.9 3.4l3.5 2.1c1-.4 2.1-.4 3.2 0l3.5-2.1-.7 3.5A7.8 7.4 8 1 1 7.6 6.9Z" />
      {/* eyes */}
      <path d="M9.2 12.2h.1" strokeWidth={2.8} />
      <path d="M14.7 12.2h.1" strokeWidth={2.8} />
      {/* mouth */}
      <path d="M10.4 15.3c.5.7 1 .9 1.5.4.5.6 1.1.5 1.7-.3" strokeWidth={1.7} />
    </Frame>
  );
}

/* ───────── annotation primitives ───────── */

type Direction = "right" | "down" | "left" | "up";

const ROTATE: Record<Direction, string> = {
  right: "rotate(0deg)",
  down: "rotate(90deg)",
  left: "rotate(180deg)",
  up: "rotate(-90deg)",
};

/**
 * A marker-drawn arrow with a lazy S-curve in the shaft. Drawn pointing
 * right; `direction` rotates it. Width is the long axis.
 */
export function DoodleArrow({
  direction = "right",
  width = 56,
  className,
  style,
  ...rest
}: Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  direction?: Direction;
  width?: number;
}) {
  const h = Math.round(width * 0.6);
  return (
    <svg
      viewBox="0 0 64 40"
      width={width}
      height={h}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={className}
      style={{ transform: ROTATE[direction], ...style }}
      {...rest}
    >
      {/* shaft: S-curve that levels out so the head sits square on its end */}
      <path d="M4 26c9-11 19-15 30-9 7 4 14 1 24 1" />
      {/* head: two arms mirrored about the shaft's final tangent, tip at (58,18) */}
      <path d="M50 11c3 2.5 5.7 4.8 8 7-2.3 2.2-5 4.6-8 7" />
    </svg>
  );
}

/**
 * An arrow that loops back on itself before heading off — the one you
 * draw in a margin when you want someone to look at a specific thing.
 * Drawn heading down-right; flip with `flip` to head down-left.
 */
export function DoodleCurlArrow({
  width = 64,
  flip = false,
  className,
  style,
  ...rest
}: Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  width?: number;
  flip?: boolean;
}) {
  const h = Math.round(width * 0.75);
  return (
    <svg
      viewBox="0 0 64 48"
      width={width}
      height={h}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={className}
      style={{ transform: flip ? "scaleX(-1)" : undefined, ...style }}
      {...rest}
    >
      <path d="M6 8c12-6 28-5 26 7-2 9-16 8-12-2 3-7 22-3 28 10 2 5 3 10 4 18" />
      <path d="M44 34c3 3 6 6 8 8 2-3 5-6 8-9" />
    </svg>
  );
}

/** A quick hand-drawn ring, for circling a word or a number. */
export function DoodleRing({
  className,
  ...rest
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.8}
      strokeLinecap="round"
      aria-hidden
      focusable="false"
      className={className}
      {...rest}
    >
      <path d="M52 5C26 3 6 10 5 21c-1 10 18 16 46 15 27-1 46-9 45-18C95 9 76 3 50 5c-6 .4-11 1.4-15 3" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Handwritten annotation text: the marker font, a slight tilt, no tracking. */
export function Handwritten({
  tilt = -2,
  className = "",
  style,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tilt?: number }) {
  return (
    <span
      className={`font-hand inline-block leading-none font-semibold tracking-normal normal-case ${className}`}
      style={{ transform: `rotate(${tilt}deg)`, ...style }}
      {...rest}
    />
  );
}

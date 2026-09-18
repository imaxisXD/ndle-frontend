"use client";

/**
 * Comic-book furniture for the pulp landing page.
 *
 * ComicDivider — a torn panel edge between two sections: the outgoing
 *   section's colour tears down into the incoming one along a fine ink
 *   line, with a halftone screen fading in underneath, the way a printed
 *   comic gutter picks up dot gain.
 *
 * ComicBurst — the starburst that holds a "BAM!" or "PING!": jittered
 *   spikes, ink outline, hard offset shadow, Sigmar italic inside, and a
 *   spring pop when it scrolls into view.
 */

import { useId, useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/* ───────── divider ───────── */

const W = 1440;
const H = 72;

// Torn edge: irregular tooth widths and depths from a seeded generator, so
// the rip looks hand-cut rather than tiled, and is identical on server and
// client. Occasional tall spikes and flat shelves are what sell it.
function tornEdge() {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const pts: Array<[number, number]> = [[0, 26]];
  let x = 0;
  while (x < W) {
    const roll = rnd();
    const dx = roll < 0.18 ? 14 + rnd() * 10 : 26 + rnd() * 40;
    x = Math.min(W, x + dx);
    const kind = rnd();
    const y =
      kind < 0.14 ? 8 + rnd() * 6 // tall spike up
      : kind < 0.3 ? 50 + rnd() * 10 // deep tear down
      : 20 + rnd() * 24; // ordinary tooth
    pts.push([Math.round(x), Math.round(y)]);
  }
  return pts;
}

const EDGE_PTS = tornEdge();
const EDGE = EDGE_PTS.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
const FILL = `M0 0 H${W} ${EDGE_PTS.slice().reverse().map(([x, y]) => `L${x} ${y}`).join(" ")} Z`;

export function ComicDivider({
  from,
  to,
  ink = "var(--pulp-ink)",
  overlay = false,
  className = "",
}: {
  /** colour of the section above (tears down into `to`) */
  from: string;
  /** colour of the section below; "transparent" when overlaying a patterned section */
  to: string;
  ink?: string;
  /** pin to the top of a `relative` section so its background shows through */
  overlay?: boolean;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      aria-hidden
      className={`${
        overlay ? "absolute inset-x-0 -top-px" : "relative -my-px"
      } z-20 h-14 w-full overflow-hidden md:h-[4.5rem] ${className}`}
      style={{ backgroundColor: to }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <pattern id={`${id}-dots`} width="12" height="12" patternUnits="userSpaceOnUse">
            <circle cx="6" cy="6" r="2.1" fill={ink} />
          </pattern>
          <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.35" stopColor="white" stopOpacity="0.38" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`${id}-mask`}>
            <rect width={W} height={H} fill={`url(#${id}-fade)`} />
          </mask>
        </defs>
        {/* Ben-Day screen printed on the incoming section, fading down */}
        <rect width={W} height={H} fill={`url(#${id}-dots)`} mask={`url(#${id}-mask)`} />
        {/* the outgoing section tearing down */}
        <path d={FILL} fill={from} />
        {/* a fine ink line along the tear, matching the 2px card borders */}
        <path
          d={EDGE}
          fill="none"
          stroke={ink}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

/* ───────── burst ───────── */

// Seeded jitter so spikes, speed lines and sparkles read as inked, not
// generated, and match on server and client.
function seeded(seed: number) {
  let x = seed;
  return () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff;
  };
}

function spikes(points: number, inner: number, radius: number, seed: number) {
  const rnd = seeded(seed);
  const n = points * 2;
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2 + (rnd() - 0.5) * 0.12;
    const r = (i % 2 === 0 ? 1 : inner) * (0.9 + rnd() * 0.22) * radius;
    out.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return out.join(" ");
}

// A cloud is a ring of overlapping circles. Drawn twice — an ink layer with a
// fat stroke, then a fill layer — the overlaps vanish and one outline remains.
function cloudCircles(rx: number, ry: number, seed: number) {
  const rnd = seeded(seed);
  const n = 9;
  // Rounded to a tenth so server and client serialise identical attributes.
  const f = (v: number) => Math.round(v * 10) / 10;
  const circles: Array<{ cx: number; cy: number; r: number }> = [{ cx: 0, cy: 0, r: f(Math.min(rx, ry) * 0.9) }];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.3;
    circles.push({
      cx: f(Math.cos(a) * rx * 0.72),
      cy: f(Math.sin(a) * ry * 0.72),
      r: f(Math.min(rx, ry) * (0.36 + rnd() * 0.16)),
    });
  }
  return circles;
}

// Tapered speed-line slivers radiating from the burst.
function speedLines(count: number, r0: number, r1: number, seed: number) {
  const rnd = seeded(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd() * 0.5;
    const len = r1 - r0 - rnd() * (r1 - r0) * 0.5;
    const w = 2.2 + rnd() * 2;
    const c = Math.cos(a), sn = Math.sin(a);
    const px = -sn * w, py = c * w;
    out.push(
      `M${(c * r0 + px).toFixed(1)} ${(sn * r0 + py).toFixed(1)} L${(c * (r0 + len)).toFixed(1)} ${(sn * (r0 + len)).toFixed(1)} L${(c * r0 - px).toFixed(1)} ${(sn * r0 - py).toFixed(1)} Z`,
    );
  }
  return out.join(" ");
}

function sparkle(cx: number, cy: number, r: number) {
  const s = r * 0.32;
  return `M${cx} ${cy - r} Q${cx + s} ${cy - s} ${cx + r} ${cy} Q${cx + s} ${cy + s} ${cx} ${cy + r} Q${cx - s} ${cy + s} ${cx - r} ${cy} Q${cx - s} ${cy - s} ${cx} ${cy - r}Z`;
}

const PALETTES = {
  /** newsstand: red spikes, cream cloud, yellow-to-orange letters */
  red: { spike: "oklch(0.6 0.22 28)", cloud: "var(--pulp-cream)", a: "var(--pulp-yellow)", b: "var(--pulp-orange)" },
  /** poster: blue spikes, cream cloud, yellow-to-orange letters */
  blue: { spike: "var(--poster)", cloud: "var(--pulp-cream)", a: "var(--pulp-yellow)", b: "var(--pulp-orange)" },
  /** alert: green spikes, cream cloud, orange-to-red letters */
  green: { spike: "oklch(0.7 0.24 145)", cloud: "var(--pulp-cream)", a: "var(--pulp-yellow)", b: "oklch(0.6 0.22 28)" },
} as const;

export function ComicBurst({
  children,
  size = 160,
  rotate = -6,
  skew = -10,
  textSize = 92,
  variant = "red",
  cloud = true,
  ink = "var(--pulp-ink)",
  className = "",
  delay = 0,
}: {
  children: string;
  size?: number;
  rotate?: number;
  /** lettering skew in degrees; negative leans right like a shout */
  skew?: number;
  /** font size in viewBox units (box is 300 wide); drop for longer words */
  textSize?: number;
  variant?: keyof typeof PALETTES;
  /** cream cloud inside the spikes, as in most word-art references */
  cloud?: boolean;
  ink?: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const p = PALETTES[variant];
  const outer = spikes(12, 0.58, 118, 3);
  const clouds = cloudCircles(92, 66, 5);
  const lines = speedLines(9, 128, 150, 11);
  const textProps = {
    x: 0,
    y: 6,
    textAnchor: "middle" as const,
    dominantBaseline: "central" as const,
    fontSize: textSize,
  };

  return (
    // Sized, positioned wrapper is what the observer watches; the inner
    // element scales, so a scale(0) start can't hide it from view.
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="h-full w-full"
        style={{ rotate }}
        initial={reduce ? false : { scale: 0, rotate: rotate - 30, opacity: 0 }}
        animate={inView ? { scale: 1, rotate, opacity: 1 } : undefined}
        transition={{ type: "spring", stiffness: 380, damping: 13, delay: reduce ? 0 : delay }}
      >
        <svg viewBox="-150 -150 300 300" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.35" stopColor={p.a} />
              <stop offset="1" stopColor={p.b} />
            </linearGradient>
            <pattern id={`${id}-dots`} width="7" height="7" patternUnits="userSpaceOnUse">
              <circle cx="3.5" cy="3.5" r="1.5" fill={ink} opacity="0.22" />
            </pattern>
            <pattern id={`${id}-dots-lg`} width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="2.2" fill={ink} opacity="0.18" />
            </pattern>
          </defs>

          {/* speed lines */}
          <path d={lines} fill={ink} />

          {/* spikes, with a hard ink cut-out shadow and a dot screen */}
          <polygon points={outer} fill={ink} transform="translate(8 9)" />
          <polygon points={outer} fill={p.spike} stroke={ink} strokeWidth={5} strokeLinejoin="round" />
          <polygon points={outer} fill={`url(#${id}-dots-lg)`} />

          {/* cloud: ink layer with fat stroke, then cream fill layer */}
          {cloud && (
            <>
              <g fill={ink} stroke={ink} strokeWidth={9}>
                {clouds.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
              </g>
              <g fill={p.cloud}>
                {clouds.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
              </g>
            </>
          )}

          {/* sparkles */}
          <path d={`${sparkle(-118, -70, 10)} ${sparkle(112, 92, 8)} ${sparkle(96, -112, 6)}`} fill={p.a} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />

          {/* lettering: 3D extrusion in ink, then outlined gradient face, then dot screen */}
          <g className="font-comic" transform={`skewX(${skew})`} style={{ letterSpacing: "0.01em" }}>
            {[7, 5.5, 4, 2.5].map((o) => (
              <text key={o} {...textProps} transform={`translate(${o} ${o})`} fill={ink} stroke={ink} strokeWidth={8} strokeLinejoin="round" style={{ paintOrder: "stroke fill" }}>
                {children}
              </text>
            ))}
            <text {...textProps} fill={`url(#${id}-grad)`} stroke={ink} strokeWidth={8} strokeLinejoin="round" style={{ paintOrder: "stroke fill" }}>
              {children}
            </text>
            <text {...textProps} fill={`url(#${id}-dots)`}>
              {children}
            </text>
          </g>
        </svg>
      </motion.div>
    </div>
  );
}

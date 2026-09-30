"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* The little drawings over the section titles and round the close, in the
   same hand as the statement's hearts (statement.tsx): a wobbly ink line
   whose ends cross where the pen closes, colour laid on a touch off the line
   like marker colouring, a halftone of dots in that colour, heavier on the
   shadow side, and a light shine on top. Drawn on a 64 × 64 box, tilted like
   a sticker. Each comes in any of the markers below; orange is the hearts'. */

export const INK = "#1b1915";

/** The markers: a light base, its dots, darker dots for shadow, and shine. */
export const PALETTES = {
  orange: { base: "#ffab80", dots: "#f2622e", shadeDots: "#c9431a", shine: "#ffd9c2" },
  violet: { base: "#cdb8ff", dots: "#8b5cf6", shadeDots: "#6d28d9", shine: "#efe8ff" },
  blue: { base: "#a9c9ff", dots: "#3b82f6", shadeDots: "#1d4ed8", shine: "#e3eeff" },
  green: { base: "#a8e6c3", dots: "#22a060", shadeDots: "#13703f", shine: "#e2f7ea" },
  yellow: { base: "#ffe28a", dots: "#f5b400", shadeDots: "#c98800", shine: "#fff5cc" },
  pink: { base: "#ffb8d4", dots: "#ec4899", shadeDots: "#be185d", shine: "#ffe4ef" },
};

type DoodleColor = keyof typeof PALETTES;
type Palette = (typeof PALETTES)[DoodleColor];
type DoodleProps = { className?: string; color?: DoodleColor };

const LINE = 2.6; // the ink line, in box units
const OFF = "translate(0.9 0.9)"; // the colour, a touch off the line

/** Pattern and clip ids that don't collide between doodles on the page. */
export function useIds() {
  const id = useId().replace(/:/g, "");
  return { fill: `dd-fill-${id}`, shade: `dd-shade-${id}`, dots: `dd-dots-${id}`, shadeDots: `dd-shade-dots-${id}`, over: `dd-over-${id}` };
}

/** The halftones: small dots all over, bigger and darker in shadow. */
export function Halftones({ ids, p }: { ids: ReturnType<typeof useIds>; p: Palette }) {
  return (
    <>
      <pattern id={ids.dots} width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <circle cx={1.5} cy={1.5} r={0.95} fill={p.dots} />
      </pattern>
      <pattern id={ids.shadeDots} width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <circle cx={1.5} cy={1.5} r={1.25} fill={p.shadeDots} />
      </pattern>
    </>
  );
}

/** A filled shape coloured the hearts' way: base, dots, dots in shadow. */
export function Colored({ d, shade, ids, p }: { d: string; shade: string; ids: ReturnType<typeof useIds>; p: Palette }) {
  return (
    <>
      <clipPath id={ids.fill}>
        <path d={d} transform={OFF} />
      </clipPath>
      <clipPath id={ids.shade}>
        <path d={shade} />
      </clipPath>
      <path d={d} transform={OFF} fill={p.base} />
      <g clipPath={`url(#${ids.fill})`}>
        <rect width={64} height={64} fill={`url(#${ids.dots})`} />
        <rect width={64} height={64} fill={`url(#${ids.shadeDots})`} clipPath={`url(#${ids.shade})`} />
      </g>
    </>
  );
}

/** The drawing's box: decoration beside a title, so hidden from readers. */
export function Sticker({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg aria-hidden viewBox="0 0 64 64" fill="none" className={cn("size-16 -rotate-6 overflow-visible", className)}>
      {children}
    </svg>
  );
}

export const ink = { stroke: INK, strokeWidth: LINE, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const shineOf = (p: Palette) => ({ stroke: p.shine, strokeWidth: 3.2, strokeLinecap: "round" }) as const;

/* ───────── A price tag, on its string: the plans ───────── */

const TAG = {
  // Starts by the tip and runs past where it began
  outline:
    "M13.4 28.9 L29.6 12.6 C30.9 11.3 32.5 10.7 34.3 10.8 L50.2 11.5 C52.3 11.6 53.6 13 53.7 15.1 L54.3 30.6 C54.4 32.4 53.8 33.9 52.6 35.1 L34.8 53 C33.1 54.7 30.6 54.7 28.9 53 L12.3 36.5 C10.5 34.7 10.4 31.9 12.2 30.1 L14.6 27.7",
  fill: "M14 29.2 L30 13.3 C31.2 12.2 32.6 11.8 34.2 11.9 L49.6 12.6 C51.4 12.7 52.5 13.8 52.6 15.6 L53.1 30.4 C53.2 31.9 52.7 33.2 51.6 34.3 L34.1 51.8 C32.7 53.2 30.7 53.2 29.3 51.8 L13 35.6 C11.6 34.2 11.6 31.8 13 30.4 Z",
  shade: "M64 22 C52 36 40 47 20 64 L64 64 Z",
  shine: "M21.3 27.4 C24.4 24.2 27.3 21.3 30.2 18.4",
  string: "M46.7 18.1 C49.6 14.7 52.4 11.3 55.6 9.6 C58.4 8.1 60.6 9.2 59.8 11.3",
  hole: { cx: 44.4, cy: 20.4, r: 3.1 },
};

export function TagDoodle({ className, color = "orange" }: DoodleProps) {
  const ids = useIds();
  const p = PALETTES[color];
  return (
    <Sticker className={className}>
      <defs>
        <Halftones ids={ids} p={p} />
      </defs>
      <Colored d={TAG.fill} shade={TAG.shade} ids={ids} p={p} />
      <path d={TAG.shine} {...shineOf(p)} />
      <path d={TAG.outline} {...ink} />
      {/* The hole, punched through, and the string tied through it */}
      <circle {...TAG.hole} fill="#ffffff" {...ink} />
      <path d={TAG.string} {...ink} strokeWidth={2.2} />
    </Sticker>
  );
}

/* ───────── A speech bubble with a question in it: the questions ───────── */

const ASK = {
  outline:
    "M15.2 13.4 C23.6 9.2 42.4 8.8 51.2 13.6 C57.6 17.1 58.7 30.2 54.1 36.6 C49.7 42.8 38.4 45 29.3 44.1 L18.6 53.6 L20.4 42.2 C12.1 38.7 7.6 31.2 8.6 24.1 C9.3 19.3 11.4 15.9 16.6 12.7",
  fill: "M16 14.6 C24 10.8 41.8 10.4 50 14.8 C55.8 18 56.6 29.8 52.6 35.5 C48.6 41 38 43.1 29.2 42.2 L20.4 50 L21.8 41.2 C14 38 9.8 31.2 10.6 24.6 C11.2 20.2 12.9 16.6 16 14.6 Z",
  shade: "M64 16 C56 32 44 42 16 64 L64 64 Z",
  shine: "M15.5 20.8 C18.2 16.9 22.8 14.8 28.4 14",
  // The question mark, in the same pen: its hook, and its dot
  mark: "M26.8 22.6 C27.2 18.9 30.1 17 33.3 17.3 C36.9 17.6 38.9 20.4 38.3 23.4 C37.7 26.4 34.5 27.3 33.4 29.5 C32.9 30.5 32.8 31.6 32.9 32.8",
  dot: { cx: 33, cy: 37.3, r: 1.8 },
};

export function AskDoodle({ className, color = "orange" }: DoodleProps) {
  const ids = useIds();
  const p = PALETTES[color];
  return (
    <Sticker className={className}>
      <defs>
        <Halftones ids={ids} p={p} />
      </defs>
      <Colored d={ASK.fill} shade={ASK.shade} ids={ids} p={p} />
      <path d={ASK.shine} {...shineOf(p)} />
      <path d={ASK.outline} {...ink} />
      <path d={ASK.mark} {...ink} strokeWidth={3} />
      <circle {...ASK.dot} fill={INK} />
    </Sticker>
  );
}

/* ───────── Two chain links, hooked together: what a link needs ───────── */

/* Each link is a thick, wobbly loop: an ink stroke with the colour laid
   down its middle. They hook through each other: the second crosses over
   the first at the bottom, the first over the second at the top. Drawn
   level, then turned to lean up and to the right. */
const CHAIN = {
  first: "M15.2 26.4 C11.1 26.6 8 29.7 8.2 33.5 C8.4 37.3 11.4 40.2 15.3 40 L28.8 39.5 C32.8 39.3 35.8 36.3 35.6 32.5 C35.4 28.8 32.3 25.9 28.5 26.1 Z",
  second: "M35.4 24.9 C31.3 25.1 28.3 28.2 28.5 32 C28.7 35.8 31.7 38.7 35.6 38.5 L49.1 38 C53.1 37.8 56.1 34.8 55.9 31 C55.7 27.3 52.6 24.4 48.8 24.6 Z",
  // Where the first link comes back over the second: their top crossing
  overTop: { x: 26, y: 20, width: 12, height: 10 },
  lean: "rotate(-38 32 32)",
  ring: 7.2, // the link's thickness, in colour
  rim: 11.6, // with its ink line on both sides
  shine: "M11.3 31.2 C12.1 29.3 13.7 28 15.8 27.7",
};

function ChainLink({ d, ids, p }: { d: string; ids: ReturnType<typeof useIds>; p: Palette }) {
  return (
    <>
      <path d={d} stroke={INK} strokeWidth={CHAIN.rim} strokeLinejoin="round" />
      <path d={d} transform={OFF} stroke={p.base} strokeWidth={CHAIN.ring} strokeLinejoin="round" />
      <path d={d} transform={OFF} stroke={`url(#${ids.dots})`} strokeWidth={CHAIN.ring} strokeLinejoin="round" />
      <path
        d={d}
        transform={OFF}
        stroke={`url(#${ids.shadeDots})`}
        strokeWidth={CHAIN.ring}
        strokeLinejoin="round"
        clipPath={`url(#${ids.shade})`}
      />
    </>
  );
}

export function LinkDoodle({ className, color = "orange" }: DoodleProps) {
  const ids = useIds();
  const p = PALETTES[color];
  return (
    <Sticker className={className}>
      <defs>
        <Halftones ids={ids} p={p} />
        {/* Shadow on the lower edge of each link, as drawn level */}
        <clipPath id={ids.shade}>
          <rect x={0} y={34} width={64} height={30} />
        </clipPath>
        <clipPath id={ids.over}>
          <rect {...CHAIN.overTop} />
        </clipPath>
      </defs>
      <g transform={CHAIN.lean}>
        <ChainLink d={CHAIN.first} ids={ids} p={p} />
        <ChainLink d={CHAIN.second} ids={ids} p={p} />
        <g clipPath={`url(#${ids.over})`}>
          <ChainLink d={CHAIN.first} ids={ids} p={p} />
        </g>
        <path d={CHAIN.shine} {...shineOf(p)} strokeWidth={2.4} />
      </g>
    </Sticker>
  );
}

/* ───────── Small ones, for flying around the close (closing.tsx) ───────── */

const HEART = {
  // The statement's heart, on this box: ends crossing at the tip
  outline:
    "M33.6 56 C23.4 47.4 8.6 37.1 6.9 23.7 C5.6 12.8 13.4 5.9 21.4 7 C27 7.8 30.9 12.6 32.8 17.3 C35 10.7 41.4 5.4 48.8 6.4 C57.4 7.7 61.1 16.6 58.4 25.8 C55.4 36.5 43.7 46.4 31 58.6",
  fill: "M33 53.4 C22.7 45.3 10.1 35.8 9.1 23.8 C8.5 14.9 14.9 9.6 21.4 10.4 C26.6 11.2 30.1 15.5 32.6 20.3 C35.2 13.9 41.3 9.1 47.8 9.9 C55 11.2 57.9 18.1 55.8 25.6 C53.3 34.9 43.2 44.2 33 53.4 Z",
  shade: "M64 14 C54 34 40 48 12 64 L64 64 Z",
  shine: "M14.7 20.2 C15 15.7 18.6 13.1 22.4 13.9",
};

export function HeartDoodle({ className, color = "orange" }: DoodleProps) {
  const ids = useIds();
  const p = PALETTES[color];
  return (
    <Sticker className={className}>
      <defs>
        <Halftones ids={ids} p={p} />
      </defs>
      <Colored d={HEART.fill} shade={HEART.shade} ids={ids} p={p} />
      <path d={HEART.shine} {...shineOf(p)} />
      <path d={HEART.outline} {...ink} />
    </Sticker>
  );
}

const SPARKLE = {
  // A four-point star, each side bowing in, closed a touch past its start
  outline: "M32.4 5.6 C34.2 20.2 38.6 25.8 56.8 29.6 C38.8 33.9 34.6 39.8 32.2 58.4 C29.8 40 25.6 34.2 7.4 30.4 C25.4 26 29.9 20.4 31.6 8.2",
  fill: "M32.8 12 C34.5 22.5 38.8 27.3 51.2 30.2 C39 33.4 34.8 38.4 32.7 51.6 C30.6 38.6 26.4 33.9 13.8 31.2 C26.1 28 30.4 23.2 32.8 12 Z",
  shade: "M64 26 C52 38 44 46 28 64 L64 64 Z",
  shine: "M28.4 22.6 C30.1 20.4 30.9 18 31.4 15.2",
};

export function SparkleDoodle({ className, color = "orange" }: DoodleProps) {
  const ids = useIds();
  const p = PALETTES[color];
  return (
    <Sticker className={className}>
      <defs>
        <Halftones ids={ids} p={p} />
      </defs>
      <Colored d={SPARKLE.fill} shade={SPARKLE.shade} ids={ids} p={p} />
      <path d={SPARKLE.shine} {...shineOf(p)} strokeWidth={2.6} />
      <path d={SPARKLE.outline} {...ink} />
    </Sticker>
  );
}

const BOLT = {
  // A lightning bolt, top to bottom, drawn in one go and back to the top
  outline: "M37.8 4.8 L14.2 35.6 L29.6 35.4 L22.8 59.4 L50.6 23.6 L33.8 24 L38.9 6.2",
  fill: "M37.6 8.8 L16.6 36.1 L31.4 35.9 L25.8 55.6 L49.2 24.9 L32.9 25.2 Z",
  shade: "M64 20 C50 34 40 44 20 64 L64 64 Z",
  shine: "M30.6 17.4 C28.7 20 26.8 22.4 25 24.8",
};

export function BoltDoodle({ className, color = "orange" }: DoodleProps) {
  const ids = useIds();
  const p = PALETTES[color];
  return (
    <Sticker className={className}>
      <defs>
        <Halftones ids={ids} p={p} />
      </defs>
      <Colored d={BOLT.fill} shade={BOLT.shade} ids={ids} p={p} />
      <path d={BOLT.shine} {...shineOf(p)} strokeWidth={2.6} />
      <path d={BOLT.outline} {...ink} />
    </Sticker>
  );
}

/* ───────── A pointing hand: the statement's clicks (statement.tsx) ───────── */

/* The link-hover hand: the index finger up, three fingers curled beside it
   and the thumb out to the left. The fingertip sits at (24.9, 5.8). The
   finger is its own piece, drawn over the palm, so it can bend: each tap
   foreshortens it toward the palm, as a finger does pressing down, with a
   crease at its knuckle, and straightens it again. */
const POINTER = {
  // From under the knuckles, round the curled fingers, palm and thumb, up
  // to the finger's foot, where the pen stops under the finger
  outline:
    "M29.5 29.2 C29.8 26.5 31.5 25.1 33.6 25.2 C35.8 25.3 37.4 27 37.5 29.6 C38 27.7 39.7 26.8 41.6 27 C43.7 27.3 45.2 29 45.3 31.6 C45.9 30 47.5 29.3 49.2 29.6 C51.3 30 52.6 31.8 52.6 34.4 L52.4 44.6 C52.2 51 48.2 55.8 42 56.4 L30.4 56.6 C26.6 56.6 23.8 55.1 21.8 52.6 L12.4 40.8 C10.7 38.8 10.9 35.9 12.9 34.4 C14.9 32.9 17.6 33.5 19 35.4 L20.8 37.8 L21.1 35.8",
  fill: "M21.9 38 L22 30.4 L28 30.4 L28 31.5 C28.6 28.4 30.9 26.8 33.4 26.9 C35.4 27 36.4 28.6 36.6 31 C37.8 29.2 39.4 28.5 41.3 28.7 C43 28.9 44 30.4 44.2 32.6 C45.2 31.4 46.8 31 48.4 31.2 C50.1 31.5 51 33 51 35 L50.9 44.4 C50.7 49.8 47.4 54 42 54.8 L30.6 55 C27.2 55 24.9 53.8 23.1 51.6 L13.8 40.1 C12.5 38.6 12.6 36.6 14 35.6 C15.5 34.5 17.4 35 18.4 36.3 L21 39.6 Z",
  // Where the curled fingers meet
  knuckles: "M37.5 29.6 L37.5 35.2 M45.3 31.6 L45.3 36",
  shade: "M64 26 C52 40 40 50 16 64 L64 64 Z",
};

/* The finger. It bends by foreshortening toward the palm, a touch wider at
   the nearer tip, with a crease at its middle joint (h2-finger-bend in
   home-2.css). */
const FINGER = {
  line: "M20.7 37.8 L20.4 11 C20.3 7.9 22.4 5.8 24.9 5.8 C27.5 5.8 29.4 7.8 29.4 10.8 L29.6 36.4",
  fill: "M21.9 38.6 L21.9 11.2 C21.9 9.1 23.2 7.5 24.9 7.5 C26.6 7.5 27.9 9.1 27.9 11.1 L28.1 38.6 Z",
  shine: "M24.2 11.8 L24.2 19.6",
  crease: "M22.6 21 C24.4 22.2 26.4 22.2 28.2 21",
};

/** Bends the finger once each time `taps` goes up. */
export function PointerDoodle({ className, color = "blue", taps = 0 }: DoodleProps & { taps?: number }) {
  const ids = useIds();
  const p = PALETTES[color];
  return (
    <Sticker className={className}>
      <defs>
        <Halftones ids={ids} p={p} />
      </defs>
      <Colored d={POINTER.fill} shade={POINTER.shade} ids={ids} p={p} />
      <path d={POINTER.outline} {...ink} />
      <path d={POINTER.knuckles} {...ink} strokeWidth={2} />
      {/* Remounted on each tap, so the bend plays again */}
      <g key={taps} className={cn(taps > 0 && "h2-finger-bend")}>
        <path d={FINGER.fill} transform={OFF} fill={p.base} />
        <path d={FINGER.fill} transform={OFF} fill={`url(#${ids.dots})`} />
        <path d={FINGER.fill} transform={OFF} fill={`url(#${ids.shadeDots})`} clipPath={`url(#${ids.shade})`} />
        <path d={FINGER.shine} {...shineOf(p)} strokeWidth={2.4} />
        <path d={FINGER.line} {...ink} />
        {taps > 0 && <path d={FINGER.crease} {...ink} strokeWidth={1.8} className="h2-finger-crease" />}
      </g>
    </Sticker>
  );
}

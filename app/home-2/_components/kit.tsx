import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/* Actions in the dashboard's own button language: the yellow primary and the
   quiet outline, same radius, same focus ring. */

/** Where the landing page lives; the shared nav and footer link here. */
export const HOME_PATH = "/";

export const FOCUS =
  "focus-visible:ring-[3px] focus-visible:ring-[oklch(0.86_0.17_88/0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none";

/* The wordmark in plain type, in Signal Yellow. A hairline of amber and a
   soft shadow keep the pale yellow legible on the light page. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block leading-none font-semibold tracking-[-0.05em] text-[var(--sig)] [text-shadow:0_0_0.6px_oklch(0.55_0.13_75/0.9),0_1px_1px_rgb(0_0_0/0.12)]",
        className,
      )}
    >
      ndle
    </span>
  );
}

export function ActionLink({
  href,
  children,
  tone = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "primary" | "outline" | "onDark";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-[background-color,box-shadow,scale] duration-150 active:scale-[0.98]",
        tone === "primary"
          ? "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-sm"
          : tone === "outline"
            ? "border-border bg-background border shadow-xs hover:bg-white"
            : "border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]",
        FOCUS,
        className,
      )}
    >
      {children}
      {tone === "primary" && <ArrowRightIcon size={16} />}
    </Link>
  );
}

/* ───────── The comic sections (bento, plans, questions, close) ───────── */

/* After capy.ai's: ink edges, tall capitals, mono copy. Ink is #141312. The
   capitals come from `--font-bebas`, set on the page root (fonts.ts). Their
   buttons are the dashboard's own (ActionLink), not capy's. */

/** A section's title in the tall capitals. */
export const INK_TITLE =
  "font-[family-name:var(--font-bebas)] text-[clamp(2.75rem,5vw,3.5rem)] leading-[0.9] tracking-[-0.01em] text-[#141312] uppercase";

/* ───────── Panels cut like the bento's ───────── */

/* The bento's panels share slanted edges across a gutter, cut like comic
   panels (feature-bento.tsx). The other comic sections cut their cards the
   same way: each corner of a card can be pulled in, in px, and a neighbour
   pulled in at the opposite ends, so the gutter between them runs on a
   slant. The ink edge is the card's ink showing round a copy of the cut
   pulled in by the edge's width. */

/** How far each corner is pulled in, as [x, y] px, clockwise from top left. */
export type Cut = { tl?: [number, number]; tr?: [number, number]; br?: [number, number]; bl?: [number, number] };

const EDGE = 2; // the ink edge, as the bento's outlines

function cutPolygon(cut: Cut, inset: number) {
  const [tlx, tly] = cut.tl ?? [0, 0];
  const [trx, tr_y] = cut.tr ?? [0, 0];
  const [brx, bry] = cut.br ?? [0, 0];
  const [blx, bly] = cut.bl ?? [0, 0];
  const px = (n: number) => `${n + inset}px`;
  const far = (n: number) => `calc(100% - ${n + inset}px)`;
  return `polygon(${px(tlx)} ${px(tly)}, ${far(trx)} ${px(tr_y)}, ${far(brx)} ${far(bry)}, ${px(blx)} ${far(bly)})`;
}

/** The cut, and the edge's inner line, as CSS variables for the classes below. */
export function cutStyle(cut: Cut) {
  return { "--cut": cutPolygon(cut, 0), "--cut-in": cutPolygon(cut, EDGE) } as CSSProperties;
}

/** A white card cut at every size, drawn behind its content (so it needs no
    wrapper, e.g. a <dl>'s group): the ink, then white inside it. */
export const CUT_BEHIND =
  "relative isolate before:absolute before:inset-0 before:-z-10 before:bg-[#141312] before:[clip-path:var(--cut)] after:absolute after:inset-0 after:-z-10 after:bg-white after:[clip-path:var(--cut-in)]";

/** A plain ink box that's cut from lg, where the cards stand side by side. */
export const CUT_FROM_LG = {
  outer: "border-2 border-[#141312] lg:border-0 lg:bg-[#141312] lg:[clip-path:var(--cut)]",
  inner: "h-full lg:[clip-path:var(--cut-in)]",
};

/** The cut for card `i` of `n` in a row (`across`) or a stack (`down`), its
    gutters leaning `slant` px from one end to the other: alternately, or all
    the same way (`parallel`), as a row of the bento's panels would. `flip`
    turns every gutter the other way. The cards' boxes overlap by
    (slant - gap) / 2 at each gutter, so the gutter's width stays `gap`; the
    caller sets those overlaps as negative margins. */
export function slantedCut(
  i: number,
  n: number,
  slant: number,
  direction: "across" | "down",
  { parallel = false, flip = false }: { parallel?: boolean; flip?: boolean } = {},
): Cut {
  const cut: Cut = {};
  // Which way gutter k leans: 0 one way, 1 the other
  const lean = (k: number) => ((parallel ? 0 : k) + (flip ? 1 : 0)) % 2;
  const before = i - 1;
  const after = i;
  if (direction === "across") {
    if (i > 0) cut[lean(before) === 0 ? "tl" : "bl"] = [slant, 0];
    if (i < n - 1) cut[lean(after) === 0 ? "br" : "tr"] = [slant, 0];
  } else {
    if (i > 0) cut[lean(before) === 0 ? "tr" : "tl"] = [0, slant];
    if (i < n - 1) cut[lean(after) === 0 ? "bl" : "br"] = [0, slant];
  }
  return cut;
}

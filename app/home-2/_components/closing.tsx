"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@ui/badge";
import { GlassFolder } from "@/components/collection/glass-folder";
import { LinkWithFavicon } from "@/components/ui/link-with-favicon";
import { getBrandBadgeDataUrl } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { PointerGlyph } from "./demo-cursor";
import { ActionLink, INK_TITLE } from "./kit";
import { SHORT_DOMAIN } from "./sample-data";
import { SiteFooter } from "./site-footer";
import { ShortLink, Toast } from "./toast";
import { useFitScale } from "./use-fit-scale";
import { useStillAfterMount } from "./use-loop-time";

/* The close, after capy.ai's "Add capy to your team": the words and the two
   actions low on the left, and on the right a comic finale. Five thin
   panels stand fanned like portals; through their slots you glimpse the
   dashboard, and the product bursts out of them: a glass folder leaps out
   to the left, the black alert toast, a QR code, a healthy chip, with the
   pointer and Signal Yellow LEDs flying where capy has its bees, and ink
   speed lines around it all. Then the site footer (site-footer.tsx).

   The finale is drawn on a 640 × 560 stage and scaled to its column. It's a
   picture, not controls: aria-hidden and inert. */

/* ─────────────────────────────────────────────────────────
 * STORYBOARD   (once, when the finale is a third in view)
 *
 *      0ms   the panels and the dashboard behind them are there
 *    120ms   the pieces burst out from the panels' middle, one after
 *            another (90ms apart), with a small comic overshoot
 *   +300ms   each piece's speed lines flick in after it
 *
 *   Reduced motion: everything in place, still.
 * ───────────────────────────────────────────────────────── */

const STAGE = { width: 640, height: 560 } as const;
const INK = "#141312";

const BURST = {
  first: 0.12, // s, first piece
  every: 0.09, // s between pieces
  lines: 0.3, // s, speed lines after their piece
  spring: { type: "spring" as const, stiffness: 260, damping: 17, mass: 0.9 },
  from: { x: 360, y: 250 }, // stage point the pieces burst from
};

/* The panels, clockwise from top-left, leaning like capy's. */
const PANELS: Array<Array<[number, number]>> = [
  [[196, 44], [238, 34], [306, 468], [266, 478]],
  [[286, 16], [334, 6], [390, 420], [344, 430]],
  [[372, 62], [414, 54], [446, 504], [404, 510]],
  [[440, 30], [490, 22], [516, 396], [468, 402]],
  [[512, 74], [572, 66], [592, 352], [532, 358]],
];

const toPath = (pts: Array<[number, number]>) => `M${pts.map(([x, y]) => `${x} ${y}`).join("L")}Z`;
const PANEL_PATHS = PANELS.map(toPath);
/** Every slot at once, for clipping the dashboard behind them. */
const SLOTS = `path("${PANEL_PATHS.join("")}")`;

/* Ink speed lines: short strokes in clusters, one per piece, and pale
   wedges fanning out behind. */
const TICKS = [
  "M52 262 L20 250 M60 238 L34 214 M76 222 L66 190",
  "M612 20 L632 4 M620 44 L640 38 M598 8 L604 -12",
  "M606 300 L630 296 M600 326 L622 338",
  "M232 540 L220 560 M258 536 L262 558",
  "M118 118 L100 100 M132 108 L128 86",
];

const WEDGES = [
  // Thin rays, tapering in toward the panels, outside the cluster
  "M186 300 L64 352 L72 368 Z",
  "M262 486 L196 556 L212 560 Z",
  "M598 236 L660 206 L664 222 Z",
  "M300 60 L230 0 L220 12 Z",
  "M560 380 L632 440 L622 452 Z",
];

/* What bursts out, in order. Positions are the resting top-left on the stage. */
const PIECES: Array<{ x: number; y: number; rotate: number; z: number; node: ReactNode }> = [
  {
    x: 18,
    y: 256,
    rotate: -12,
    z: 3,
    node: (
      <span className="block w-[228px]">
        <GlassFolder
          previewUrls={["https://github.com", "https://vercel.com", "https://figma.com"]}
          color={INK}
          label="Launch week"
          meta="12 links"
          lift={false}
          hovered
          open
        />
      </span>
    ),
  },
  {
    x: 330,
    y: 0,
    rotate: 5,
    z: 4,
    node: (
      <span className="grid w-[300px]">
        <Toast
          shown
          tone="down"
          title={
            <>
              <ShortLink /> is down
            </>
          }
        >
          404 Not Found. We emailed you.
        </Toast>
      </span>
    ),
  },
  {
    x: 470,
    y: 250,
    rotate: 9,
    z: 3,
    node: (
      <span className="block rounded-[12px] border-2 border-[#141312] bg-white p-2.5">
        <QRCodeSVG
          value={`https://${SHORT_DOMAIN}/launch`}
          size={104}
          level="H"
          fgColor={INK}
          bgColor="#ffffff"
          marginSize={0}
          imageSettings={{ src: getBrandBadgeDataUrl(INK), width: 24, height: 24, excavate: true }}
        />
      </span>
    ),
  },
  {
    x: 236,
    y: 478,
    rotate: -6,
    z: 4,
    node: (
      <span className="flex items-center gap-2 rounded-full border-2 border-[#141312] bg-white py-1.5 pr-3.5 pl-2 font-mono text-[13px] whitespace-nowrap text-[#141312]">
        <Badge variant="green">healthy</Badge>
        {SHORT_DOMAIN}/docs · 88ms
      </span>
    ),
  },
  {
    x: 132,
    y: 124,
    rotate: -18,
    z: 5,
    node: (
      <span className="block origin-top-left scale-[1.6]">
        <PointerGlyph />
      </span>
    ),
  },
];

/* Signal Yellow LEDs flying like capy's bees, after the pieces. */
const LEDS = [
  { x: 118, y: 196, size: 18 },
  { x: 586, y: 214, size: 14 },
  { x: 300, y: 350, size: 11 },
];

/* A glimpse of the dashboard behind the panels: Link Monitoring, one row
   down, and the hourly bars. Only the slots show it. */
const ROWS = [
  { slug: "launch", destination: "https://acme.com/launch-week", down: true },
  { slug: "docs", destination: "https://notion.so/acme/docs", down: false },
  { slug: "repo", destination: "https://github.com/acme/app", down: false },
  { slug: "deck", destination: "https://figma.com/deck/acme", down: false },
];
const BARS = [22, 30, 46, 64, 82, 96, 88, 70, 58, 66, 84, 92, 74, 50];

export function Closing({ signedIn }: { signedIn: boolean }) {
  return (
    <>
      <section aria-labelledby="cta-title" className="mx-auto max-w-[1240px] px-5 pt-20 pb-24 sm:px-8 lg:pt-28 lg:pb-32">
        <div className="flex flex-col-reverse gap-10 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div className="lg:pb-6">
            {/* Leading after the size: tailwind-merge drops a leading that a
                later font size could override. */}
            <h2 id="cta-title" className={cn(INK_TITLE, "text-[clamp(3rem,6vw,4.5rem)] leading-[0.9]")}>
              Add your links
              <span className="block">to ndle</span>
            </h2>
            <p className="mt-4 max-w-[38ch] font-mono text-[17px] leading-[1.45] text-[#141312]">
              ndle shortens them, checks every one and tells you when one breaks. Free plan, no card needed.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ActionLink href={signedIn ? "/dashboard" : "/sign-up?redirect_url=/dashboard"}>
                {signedIn ? "Open your dashboard" : "Get started free"}
              </ActionLink>
              {!signedIn && (
                <ActionLink href="/sign-in?redirect_url=/dashboard" tone="outline">
                  Sign in
                </ActionLink>
              )}
            </div>
          </div>
          <Finale />
        </div>
      </section>

      <SiteFooter />
    </>
  );
}

function Finale() {
  const frameRef = useRef<HTMLDivElement>(null);
  const scale = useFitScale(frameRef, STAGE.width);
  const inView = useInView(frameRef, { once: true, amount: 0.3 });
  const reduce = useStillAfterMount();
  const out = inView || reduce;

  return (
    <div
      ref={frameRef}
      inert
      aria-hidden
      className="relative w-full shrink-0 select-none lg:w-[min(640px,56%)]"
      style={{ aspectRatio: `${STAGE.width} / ${STAGE.height}` }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}
      >
        <svg className="absolute inset-0 overflow-visible" width={STAGE.width} height={STAGE.height} fill="none">
          {/* Pale wedges, behind everything */}
          {WEDGES.map((d) => (
            <path key={d} d={d} fill="#e7e6e2" />
          ))}
          {PANEL_PATHS.map((d) => (
            <path key={d} d={d} fill="#ffffff" />
          ))}
        </svg>

        {/* The dashboard, seen only through the slots */}
        <div className="absolute inset-0 font-mono" style={{ clipPath: SLOTS }}>
          <div className="absolute top-[40px] left-[150px] w-[500px] -rotate-6 overflow-hidden rounded-[12px] border-2 border-[#141312] bg-white">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium text-zinc-700">Link Monitoring</div>
            {ROWS.map((row) => (
              <div key={row.slug} className={cn("flex items-center gap-3 border-t border-zinc-100 px-4 py-2.5", row.down && "bg-red-50/80")}>
                <Badge variant={row.down ? "red" : "green"} className="w-[62px] shrink-0 justify-center">
                  {row.down ? "error" : "healthy"}
                </Badge>
                <LinkWithFavicon url={`https://${SHORT_DOMAIN}/${row.slug}`} originalUrl={row.destination} tabIndex={-1} size="sm" />
                <span className={cn("ml-auto text-xs", row.down ? "text-red-600" : "text-green-600")}>{row.down ? "404" : "142ms"}</span>
              </div>
            ))}
            <div className="flex h-[150px] items-end gap-1.5 border-t border-zinc-100 px-4 pb-4">
              {BARS.map((h, i) => (
                <span key={i} className="flex-1 rounded-t-[3px] bg-[#ffc921]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        <svg className="absolute inset-0 overflow-visible" width={STAGE.width} height={STAGE.height} fill="none">
          {PANEL_PATHS.map((d) => (
            <path key={d} d={d} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {/* Speed lines, each cluster just after its piece lands */}
          {TICKS.map((d, i) =>
            reduce ? (
              <path key={d} d={d} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
            ) : (
              <motion.path
                key={d}
                d={d}
                stroke={INK}
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={out ? { opacity: 1 } : undefined}
                transition={{ delay: BURST.first + i * BURST.every + BURST.lines, duration: 0.15 }}
              />
            ),
          )}
        </svg>

        {PIECES.map((piece, i) => (
          <Burst key={i} x={piece.x} y={piece.y} rotate={piece.rotate} index={i} out={out} reduce={reduce} z={piece.z}>
            {piece.node}
          </Burst>
        ))}
        {LEDS.map((led, i) => (
          <Burst key={`led-${i}`} x={led.x} y={led.y} rotate={0} index={PIECES.length + i} out={out} reduce={reduce} z={5}>
            <span className="h2-led block" style={{ width: led.size, height: led.size, marginLeft: 0 }} />
          </Burst>
        ))}
      </div>
    </div>
  );
}

/** One piece bursting out of the panels to its resting place. */
function Burst({
  x,
  y,
  rotate,
  index,
  out,
  reduce,
  z,
  children,
}: {
  x: number;
  y: number;
  rotate: number;
  index: number;
  out: boolean;
  reduce: boolean;
  z: number;
  children: ReactNode;
}) {
  // Still: already in place, no motion at all.
  if (reduce) {
    return (
      <div className="absolute top-0 left-0" style={{ zIndex: z, transform: `translate(${x}px, ${y}px) rotate(${rotate}deg)` }}>
        {children}
      </div>
    );
  }
  // It starts most of the way back toward the burst point, small and unturned.
  const start = { x: x + (BURST.from.x - x) * 0.8, y: y + (BURST.from.y - y) * 0.8 };
  return (
    <motion.div
      className="absolute top-0 left-0"
      style={{ zIndex: z }}
      initial={{ ...start, rotate: 0, scale: 0.35, opacity: 0 }}
      animate={out ? { x, y, rotate, scale: 1, opacity: 1 } : undefined}
      transition={{ ...BURST.spring, delay: BURST.first + index * BURST.every }}
    >
      {children}
    </motion.div>
  );
}

"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView } from "motion/react";
import { QrCode } from "@/components/ui/qr-code";
import { Badge } from "@ui/badge";
import { GlassFolder } from "@/components/collection/glass-folder";
import { LinkWithFavicon } from "@/components/ui/link-with-favicon";
import { getBrandBadgeDataUrl } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { PointerGlyph } from "./demo-cursor";
import { BoltDoodle, HeartDoodle, SparkleDoodle } from "./dot-doodles";
import { ActionLink, ByAuth, INK_TITLE, type Auth } from "./kit";
import { SHORT_DOMAIN, sampleFavicon } from "./sample-data";
import { SiteFooter } from "./site-footer";
import { ShortLink, Toast } from "./toast";
import { useFitScale } from "./use-fit-scale";
import { useStillAfterMount } from "./use-loop-time";

/* The close, after capy.ai's "Add capy to your team": the words and the two
   actions low on the left, and on the right a comic finale. ndle's Link
   Monitoring card sits in the middle, whole and readable, one link down,
   and the product bursts out of it: a glass folder leaps out to the left,
   the black alert toast for the broken link, a QR code, a healthy chip,
   with the pointer and three dotted doodles (dot-doodles.tsx, the
   statement's hearts' hand) flying where capy has its bees, and ink speed
   lines around it all. Then the site footer
   (site-footer.tsx).

   The finale is drawn on a 640 × 560 stage and scaled to its column. It's a
   picture, not controls: aria-hidden and inert. */

/* ─────────────────────────────────────────────────────────
 * STORYBOARD   (once, when the finale is a third in view)
 *
 *      0ms   the Link Monitoring card is there
 *    120ms   the pieces burst out from the card's middle, one after
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

/* The card the pieces burst from: where it sits on the stage, and its lean. */
const CARD = { x: 150, y: 86, width: 410, rotate: -6 };

/* Ink speed lines: short strokes in clusters, one per piece, and pale
   wedges fanning out behind the card. */
const TICKS = [
  "M52 262 L20 250 M60 238 L34 214 M76 222 L66 190",
  "M612 20 L632 4 M620 44 L640 38 M598 8 L604 -12",
  "M612 344 L636 340 M606 370 L628 382",
  "M232 540 L220 560 M258 536 L262 558",
  "M118 118 L100 100 M132 108 L128 86",
];

const WEDGES = [
  // Thin rays, tapering in toward the card, outside the cluster
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
    // Low on the card's right, clear of its rows
    x: 474,
    y: 296,
    rotate: 9,
    z: 3,
    node: (
      <span className="block rounded-[12px] border-2 border-[#141312] bg-white p-2.5">
        <QrCode
          value={`https://${SHORT_DOMAIN}/launch`}
          size={104}
          ecc="H"
          fg={INK}
          bg="#ffffff"
          margin={0}
          logo={{ href: getBrandBadgeDataUrl(INK), size: 24 }}
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

/* Dotted doodles flying like capy's bees, after the pieces, each in its own
   marker: sparkles by the folder and over the card, hearts by the toast and
   under the folder, a bolt by the healthy chip. */
const DOODLES: Array<{ x: number; y: number; rotate: number; node: ReactNode }> = [
  { x: 86, y: 160, rotate: -10, node: <SparkleDoodle color="yellow" className="size-11" /> },
  { x: 592, y: 196, rotate: 12, node: <HeartDoodle color="pink" className="size-10" /> },
  { x: 566, y: 470, rotate: -8, node: <BoltDoodle color="violet" className="size-10" /> },
  { x: 240, y: 26, rotate: 14, node: <SparkleDoodle color="blue" className="size-8" /> },
  { x: 58, y: 468, rotate: -16, node: <HeartDoodle color="orange" className="size-9" /> },
];

/* The card: Link Monitoring, the launch link down (the toast's link), the
   rest healthy at the hero demo's latencies, and today's clicks under it. */
const ROWS = [
  { slug: "launch", destination: "https://acme.com/launch-week", down: true, latency: "" },
  { slug: "docs", destination: "https://notion.so/acme/docs", down: false, latency: "88ms" },
  { slug: "repo", destination: "https://github.com/acme/app", down: false, latency: "64ms" },
  { slug: "deck", destination: "https://figma.com/deck/acme", down: false, latency: "120ms" },
];
const BARS = [22, 30, 46, 64, 82, 96, 88, 70, 58, 66, 84, 92, 74, 50];

export function Closing({ auth }: { auth: Auth }) {
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
            <ByAuth
              auth={auth}
              className="mt-7"
              signedOut={(link) => (
                <>
                  <ActionLink href="/sign-up?redirect_url=/dashboard" {...link}>
                    Get started free
                  </ActionLink>
                  <ActionLink href="/sign-in?redirect_url=/dashboard" tone="outline" {...link}>
                    Sign in
                  </ActionLink>
                </>
              )}
              signedIn={(link) => (
                <ActionLink href="/dashboard" {...link}>
                  Open your dashboard
                </ActionLink>
              )}
            />
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
        </svg>

        {/* The dashboard card, whole: the pieces burst out of it */}
        <div
          className="absolute top-0 left-0 overflow-hidden rounded-[12px] border-2 border-[#141312] bg-white font-mono shadow-[3px_4px_0_0_#141312]"
          style={{ width: CARD.width, transform: `translate(${CARD.x}px, ${CARD.y}px) rotate(${CARD.rotate}deg)` }}
        >
          <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium text-zinc-700">Link Monitoring</div>
          {ROWS.map((row) => (
            <div key={row.slug} className={cn("flex items-center gap-3 border-t border-zinc-100 px-4 py-2.5 first-of-type:border-t-0", row.down && "bg-red-50/80")}>
              <Badge variant={row.down ? "red" : "green"} className="w-[62px] shrink-0 justify-center">
                {row.down ? "error" : "healthy"}
              </Badge>
              <LinkWithFavicon url={`https://${SHORT_DOMAIN}/${row.slug}`} originalUrl={row.destination} faviconSrc={sampleFavicon(row.destination)} tabIndex={-1} size="sm" />
              <span className={cn("ml-auto text-xs tabular-nums", row.down ? "text-red-600" : "text-green-600")}>{row.down ? "404" : row.latency}</span>
            </div>
          ))}
          <div className="border-t border-zinc-200 px-4 pt-2.5 pb-3">
            <p className="text-[11px] text-zinc-500">Clicks, last 14 hours</p>
            <div className="mt-2 flex h-[88px] items-end gap-1.5">
              {BARS.map((h, i) => (
                <span key={i} className="flex-1 rounded-t-[3px] bg-[#ffc921]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        <svg className="absolute inset-0 overflow-visible" width={STAGE.width} height={STAGE.height} fill="none">
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
        {DOODLES.map((doodle, i) => (
          <Burst key={`doodle-${i}`} x={doodle.x} y={doodle.y} rotate={doodle.rotate} index={PIECES.length + i} out={out} reduce={reduce} z={5}>
            {doodle.node}
          </Burst>
        ))}
      </div>
    </div>
  );
}

/** One piece bursting out of the card to its resting place. */
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

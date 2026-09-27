"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { useInView, useReducedMotion } from "motion/react";
import {
  ArrowClockwiseIcon,
  ClockIcon,
  HeartbeatIcon,
  ShieldCheckIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ui/badge";
import { cn } from "@/lib/utils";
import { LAUNCH_LATENCY, SHORT_DOMAIN, type Health } from "./sample-data";

/* The hero is the Monitoring page filling itself in. It opens on the
   hand-drawn empty state a new user sees on day one (ndle's own illustration);
   then, card by card, each sketched slot is inked into the live page and its
   handwritten note is rewritten with what the page now knows. Once it is
   whole, a check fails and recovers, which is what monitoring is for.

   The sketch is cut into regions that tile the whole drawing, so each part
   can fade on its own cue. Geometry is measured in the sketch's own pixels
   (1536 x 1024) and placed in percentages; type is sized in container units
   so the live page scales with the drawing. */

const W = 1536;
const H = 1024;
const PLAYED_KEY = "ndle-home2-incident-played";
const SKETCH = "/empty-states/no-monitoring.webp";

function box(x1: number, y1: number, x2: number, y2: number): CSSProperties {
  return {
    left: `${(x1 / W) * 100}%`,
    top: `${(y1 / H) * 100}%`,
    width: `${((x2 - x1) / W) * 100}%`,
    height: `${((y2 - y1) / H) * 100}%`,
  };
}

/** Sketch pixels to container-query width units. */
const cq = (px: number) => `${(px / W) * 100}cqw`;

type Phase = "calm" | "down" | "back";

type Check = { time: string; label: string; regions: Array<"ok" | "fail">; tone: "ok" | "fail" };

const CALM_CHECKS: Check[] = [
  { time: "09:41:00", label: "200 · 142ms", regions: ["ok", "ok", "ok", "ok"], tone: "ok" },
  { time: "09:40:00", label: "200 · 139ms", regions: ["ok", "ok", "ok", "ok"], tone: "ok" },
  { time: "09:39:00", label: "200 · 151ms", regions: ["ok", "ok", "ok", "ok"], tone: "ok" },
];
const DOWN_CHECK: Check = { time: "09:42:03", label: "503 · 2 of 4", regions: ["fail", "ok", "fail", "ok"], tone: "fail" };
const BACK_CHECK: Check = { time: "09:46:12", label: "200 · 164ms", regions: ["ok", "ok", "ok", "ok"], tone: "ok" };

const UPTIME: Array<"ok" | "warn"> = ["ok", "ok", "ok", "warn", "ok", "ok", "ok", "ok", "ok", "ok", "ok"];
const SQUARES_X = [546, 605, 664, 722, 781, 840, 900, 961, 1027, 1088, 1149, 1211];

type Region = [x1: number, y1: number, x2: number, y2: number];

/* The build order: window, link, health, checks, uptime. Outer pieces (the
   frame and the notes around it) sit under the live window; inner pieces
   sit on top of it until their own card is inked in. Together they tile the
   drawing with no overlaps, so nothing is drawn twice. */
const OUTER: Array<{ r: Region; stage: number }> = [
  { r: [0, 0, 1536, 205], stage: 1 },
  { r: [228, 205, 262, 872], stage: 1 },
  { r: [1290, 205, 1328, 872], stage: 1 },
  { r: [262, 846, 1290, 872], stage: 1 },
  { r: [0, 205, 228, 430], stage: 2 },
  { r: [1328, 205, 1536, 445], stage: 2 },
  { r: [0, 430, 228, 760], stage: 3 },
  { r: [1328, 445, 1536, 872], stage: 4 },
  { r: [0, 760, 228, 1024], stage: 5 },
  { r: [228, 872, 1536, 1024], stage: 5 },
];
const INNER: Array<{ r: Region; stage: number }> = [
  { r: [262, 205, 1290, 400], stage: 2 },
  { r: [262, 400, 810, 703], stage: 3 },
  { r: [810, 400, 1290, 703], stage: 4 },
  { r: [262, 703, 1290, 846], stage: 5 },
];
const LAST_STAGE = 5;

export function SketchToLive({ onHealth }: { onHealth?: (health: Health) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inView = useInView(wrapRef, { once: true, amount: 0.35 });
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [phase, setPhase] = useState<Phase>("calm");
  const built = stage >= LAST_STAGE;

  // Ink the page in once, a card at a time, after a beat on the sketch.
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setStage(LAST_STAGE);
      return;
    }
    const timers = Array.from({ length: LAST_STAGE }, (_, i) =>
      window.setTimeout(() => setStage(i + 1), 900 + i * 420),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduce]);

  // Then, once per session, a check fails, you are emailed, and it comes back.
  useEffect(() => {
    if (!built || reduce) return;
    if (window.sessionStorage.getItem(PLAYED_KEY) === "1") return;
    const timers = [
      window.setTimeout(() => setPhase("down"), 2000),
      window.setTimeout(() => setPhase("back"), 5600),
      window.setTimeout(() => window.sessionStorage.setItem(PLAYED_KEY, "1"), 5800),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [built, reduce]);

  useEffect(() => {
    onHealth?.(phase === "down" ? "down" : "healthy");
  }, [phase, onHealth]);

  const checks =
    phase === "calm" ? CALM_CHECKS : phase === "down" ? [DOWN_CHECK, ...CALM_CHECKS].slice(0, 3) : [BACK_CHECK, DOWN_CHECK, CALM_CHECKS[0]];
  const down = phase === "down";
  const on = (n: number) => stage >= n;

  return (
    <div ref={wrapRef} className="relative aspect-[1536/1024] w-full select-none [container-type:inline-size]">
      {OUTER.map(({ r, stage: n }) => (
        <SketchPiece key={r.join()} r={r} gone={on(n)} />
      ))}

      <div aria-hidden className="absolute inset-0 font-mono text-[oklch(0.16_0.004_85)]">
        {/* The window and its title bar */}
        <Ink on={on(1)}>
          <div className="absolute rounded-[2.1cqw] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.09),0_2px_8px_rgba(0,0,0,0.06)]" style={box(238, 118, 1322, 862)} />
          <div className="absolute border-b border-black/[0.08]" style={box(238, 118, 1322, 200)} />
          {[303, 357, 414].map((x) => (
            <span key={x} className="absolute rounded-full bg-[oklch(0.88_0_0)]" style={box(x - 10, 147, x + 10, 167)} />
          ))}
          <span className="font-doto roundness-100 font-black absolute flex items-center whitespace-nowrap" style={{ ...box(468, 138, 900, 178), fontSize: cq(30) }}>
            Link Monitoring
          </span>
          <span className="absolute flex items-center justify-end gap-[0.5cqw] whitespace-nowrap text-[oklch(0.42_0_0)]" style={{ ...box(780, 146, 1095, 186), fontSize: cq(17) }}>
            <span className="animate-live-blip size-[0.55cqw] rounded-full bg-green-500" />
            Checking every 60s
          </span>
          <span className="absolute flex items-center justify-center rounded-[0.7cqw] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)]" style={box(1113, 139, 1200, 193)}>
            <ArrowClockwiseIcon style={{ width: cq(26), height: cq(26) }} />
          </span>
          <span className="absolute flex items-center justify-center gap-[0.35cqw]" style={box(1225, 160, 1285, 178)}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-[0.35cqw] rounded-full bg-[oklch(0.5_0_0)]" />
            ))}
          </span>
        </Ink>

        {/* Sketched cards stay drawn on the white window until they are inked. */}
        {INNER.map(({ r, stage: n }) => (
          <SketchPiece key={r.join()} r={r} gone={on(n)} />
        ))}

        {/* The link */}
        <Ink on={on(2)}>
          <Card at={box(280, 222, 1280, 387)} tone={down ? "fail" : "none"} />
          <span className="absolute flex items-center justify-center rounded-full bg-[#141210] font-sans font-semibold text-[#fafaf9] ring-[0.2cqw] ring-black/10 ring-offset-[0.2cqw]" style={{ ...box(310, 252, 410, 352), fontSize: cq(44) }}>
            A
          </span>
          <div className="absolute flex flex-col justify-center gap-[0.45cqw]" style={box(440, 262, 910, 348)}>
            <span className="truncate font-semibold tracking-[-0.01em]" style={{ fontSize: cq(30) }}>
              {SHORT_DOMAIN}/launch
            </span>
            <span className="truncate text-[oklch(0.46_0_0)]" style={{ fontSize: cq(19) }}>
              → acme.com/launch-week
            </span>
          </div>
          <span className="absolute flex items-center justify-center" style={box(930, 287, 1100, 342)}>
            <Badge
              key={down ? "down" : "up"}
              variant={down ? "red" : "green"}
              label={down ? "Down" : "Healthy"}
              className="h2-settle justify-center rounded-[0.6cqw]"
              style={{ fontSize: cq(20), padding: `${cq(6)} ${cq(18)}` }}
            />
          </span>
          <span className={cn("absolute flex items-center justify-center transition-colors duration-500", down ? "text-red-500" : "text-green-600")} style={box(1135, 252, 1250, 378)}>
            {down ? (
              <ShieldWarningIcon weight="duotone" style={{ width: cq(104), height: cq(104) }} />
            ) : (
              <ShieldCheckIcon weight="duotone" style={{ width: cq(104), height: cq(104) }} />
            )}
          </span>
          <Note at={[50, 226]} tilt={-3}>{phase === "calm" ? "your link, added" : phase === "down" ? "this one broke" : "your link, back"}</Note>
          <Arrow d="M168 300 C 190 318, 214 316, 236 306" />
          <Note at={[1352, 272]} tilt={2} width={150}>{down ? "alert emailed to you" : "monitoring on, every 60s"}</Note>
          <Arrow d="M1350 330 C 1318 322, 1290 328, 1258 336" />
        </Ink>

        {/* Health */}
        <Ink on={on(3)}>
          <Card at={box(275, 410, 797, 692)} />
          <span className="absolute flex items-center gap-[0.6cqw]" style={{ ...box(303, 436, 700, 478), fontSize: cq(19) }}>
            <HeartbeatIcon weight="duotone" className={down ? "text-red-500" : "text-[oklch(0.3_0_0)]"} style={{ width: cq(34), height: cq(34) }} />
            <span className="font-medium">Health</span>
            <span className="text-[oklch(0.46_0_0)]">· latency 24h</span>
          </span>
          <span className="absolute flex items-center justify-end text-[oklch(0.46_0_0)] tabular-nums" style={{ ...box(600, 436, 772, 478), fontSize: cq(18) }}>
            p50 142ms
          </span>
          <LatencyTrace at={box(316, 492, 768, 668)} down={down} />
          <Note at={[46, 505]} tilt={-2}>{down ? "spiked, then gone" : "steady, 142ms"}</Note>
          <Arrow d="M150 552 C 175 540, 196 546, 222 550" />
        </Ink>

        {/* Checks */}
        <Ink on={on(4)}>
          <Card at={box(822, 418, 1282, 695)} />
          {checks.map((c, i) => {
            const y = [462, 537, 612][i];
            return (
              <div key={`${c.time}-${i}`} className={cn("absolute flex items-center", i === 0 && phase !== "calm" && "h2-settle")} style={{ ...box(852, y - 26, 1262, y + 26), fontSize: cq(19) }}>
                <span className={cn("size-[1.2cqw] shrink-0 rounded-full", c.tone === "fail" ? "bg-red-500" : "bg-green-500")} />
                <span className="ml-[1.2cqw] tabular-nums">{c.time}</span>
                <span className={cn("ml-[1cqw] tabular-nums", c.tone === "fail" ? "text-red-600" : "text-[oklch(0.46_0_0)]")}>{c.label}</span>
                <span className="ml-auto flex gap-[0.55cqw]">
                  {c.regions.map((r, j) => (
                    <span key={j} className={cn("size-[1.05cqw] rounded-full", r === "fail" ? "bg-red-500" : "bg-green-500")} />
                  ))}
                </span>
              </div>
            );
          })}
          {[500, 575, 650].map((y) => (
            <span key={y} className="absolute border-t border-dashed border-black/[0.12]" style={box(845, y, 1262, y + 1)} />
          ))}
          <Note at={[1370, 528]} tilt={-2} width={130}>{down ? "2 regions failing" : phase === "back" ? "back after 4m 12s" : "4 of 4 regions OK"}</Note>
          <Arrow d="M1366 578 C 1356 574, 1346 575, 1336 577" />
        </Ink>

        {/* Uptime */}
        <Ink on={on(5)}>
          <Card at={box(272, 712, 1280, 835)} />
          <span className="absolute flex items-center gap-[1cqw]" style={{ ...box(300, 735, 540, 797), fontSize: cq(19) }}>
            <ClockIcon weight="duotone" style={{ width: cq(56), height: cq(56) }} />
            <span className="leading-tight">
              <span className="block font-medium">99.2%</span>
              <span className="block text-[oklch(0.46_0_0)]">last 12 days</span>
            </span>
          </span>
          {SQUARES_X.map((x, i) => {
            const today = i === SQUARES_X.length - 1;
            const state = today ? (down ? "fail" : phase === "back" ? "warn" : "ok") : UPTIME[i];
            return (
              <span
                key={x}
                className={cn(
                  "absolute rounded-[0.35cqw] transition-colors duration-500",
                  state === "ok" ? "bg-green-500" : state === "warn" ? "bg-amber-400" : "bg-red-500",
                )}
                style={box(x, 752, x + 42, 798)}
              />
            );
          })}
          <Note at={[176, 892]} tilt={-2}>30 days, 99.2% up</Note>
          <Arrow d="M410 932 C 450 925, 480 905, 498 872" />
        </Ink>
      </div>
    </div>
  );
}

/** One region of the day-one sketch, clipped out of the full drawing. */
function SketchPiece({ r, gone }: { r: Region; gone: boolean }) {
  const [x1, y1, x2, y2] = r;
  const clip = `inset(${(y1 / H) * 100}% ${100 - (x2 / W) * 100}% ${100 - (y2 / H) * 100}% ${(x1 / W) * 100}%)`;
  return (
    <Image
      src={SKETCH}
      alt=""
      fill
      unoptimized
      priority
      draggable={false}
      className={cn(
        "pointer-events-none object-contain transition-[opacity,filter] duration-500 ease-out",
        gone && "opacity-0 blur-[3px]",
      )}
      style={{ clipPath: clip }}
    />
  );
}

/** A live card arriving: it sharpens into place over the sketch it replaces. */
function Ink({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-0 transition-[opacity,filter,translate] delay-75 duration-[650ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        on ? "opacity-100" : "translate-y-[0.8cqw] opacity-0 blur-[5px]",
      )}
    >
      {children}
    </div>
  );
}

function Card({ at, tone = "none" }: { at: CSSProperties; tone?: "none" | "fail" }) {
  return (
    <div
      className={cn(
        "absolute rounded-[1.2cqw] bg-[oklch(0.99_0_0)] transition-shadow duration-500",
        tone === "fail"
          ? "shadow-[0_0_0_1.5px_rgba(239,68,68,0.55)] [background-image:repeating-linear-gradient(135deg,transparent_0_10px,rgba(239,68,68,0.06)_10px_20px)]"
          : "shadow-[0_0_0_1px_rgba(0,0,0,0.09)]",
      )}
      style={at}
    />
  );
}

function Note({ at, tilt, width = 170, children }: { at: [number, number]; tilt: number; width?: number; children: string }) {
  return (
    <span
      className="font-hand absolute leading-[1.05] font-semibold text-[oklch(0.25_0.01_85)]"
      style={{
        left: `${(at[0] / W) * 100}%`,
        top: `${(at[1] / H) * 100}%`,
        width: `${(width / W) * 100}%`,
        fontSize: cq(33),
        transform: `rotate(${tilt}deg)`,
      }}
    >
      {children}
    </span>
  );
}

/* A pen stroke ending in a small open arrowhead, like the sketch's own. */
function Arrow({ d }: { d: string }) {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const [x2, y2] = nums.slice(-2);
  const [cx, cy] = nums.slice(-4, -2);
  const angle = Math.atan2(y2 - cy, x2 - cx);
  // Rounded so the server and browser print the same path (Math.sin differs in the last digits).
  const head = (a: number) =>
    `${(x2 - 16 * Math.cos(angle - a)).toFixed(1)},${(y2 - 16 * Math.sin(angle - a)).toFixed(1)}`;
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={d} fill="none" stroke="oklch(0.25 0.01 85)" strokeWidth={2.4} strokeLinecap="round" />
      <path
        d={`M${head(0.5)} L${x2},${y2} L${head(-0.5)}`}
        fill="none"
        stroke="oklch(0.25 0.01 85)"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* The health card's line: a day of latency, with the incident as a gap. */
function LatencyTrace({ at, down }: { at: CSSProperties; down: boolean }) {
  const w = 452;
  const h = 176;
  const max = 520;
  const pts = LAUNCH_LATENCY.map((v, i) => ({
    x: (i / (LAUNCH_LATENCY.length - 1)) * w,
    y: v === null ? null : h - 22 - (Math.min(v, max) / max) * (h - 40),
  }));
  let d = "";
  let pen = false;
  for (const pt of pts) {
    if (pt.y === null) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    pen = true;
  }
  const gap0 = pts[65].x;
  const gap1 = pts[68].x;
  return (
    <svg className="absolute overflow-visible" style={at} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <line x1={0} x2={w} y1={h - 14} y2={h - 14} stroke="oklch(0.85 0 0)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {Array.from({ length: 8 }, (_, i) => (
        <line key={i} x1={(i / 7) * w} x2={(i / 7) * w} y1={h - 14} y2={h - 8} stroke="oklch(0.75 0 0)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
      <rect x={gap0} y={0} width={gap1 - gap0} height={h - 14} className={cn("transition-colors duration-500", down ? "fill-red-500/20" : "fill-red-500/10")} />
      <path d={d} fill="none" stroke="oklch(0.2 0.004 85)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* Phones get the watched page on its own, at a readable size. */
export function LiveMini() {
  return (
    <div className="overflow-hidden rounded-[14px] bg-white font-mono text-[oklch(0.16_0.004_85)] shadow-[0_0_0_1px_rgba(0,0,0,0.09),0_2px_8px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between border-b border-black/[0.07] px-4 py-3">
        <span className="font-doto roundness-100 font-black text-base">Link Monitoring</span>
        <span className="flex items-center gap-1.5 text-xs text-[oklch(0.42_0_0)]">
          <span className="animate-live-blip size-1.5 rounded-full bg-green-500" />
          every 60s
        </span>
      </div>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#141210] font-sans font-semibold text-white">A</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{SHORT_DOMAIN}/launch</div>
          <div className="truncate text-xs text-[oklch(0.46_0_0)]">→ acme.com/launch-week</div>
        </div>
        <Badge variant="green" label="Healthy" />
      </div>
      <ul className="border-t border-black/[0.06] px-4 py-2 text-xs">
        {CALM_CHECKS.map((c) => (
          <li key={c.time} className="flex items-center gap-2.5 border-b border-dashed border-black/[0.1] py-2 last:border-b-0">
            <span className="size-2 rounded-full bg-green-500" />
            <span className="tabular-nums">{c.time}</span>
            <span className="text-[oklch(0.46_0_0)] tabular-nums">{c.label}</span>
            <span className="ml-auto flex gap-1">
              {c.regions.map((_, j) => (
                <span key={j} className="size-1.5 rounded-full bg-green-500" />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3 border-t border-black/[0.06] px-4 py-3">
        <span className="text-xs whitespace-nowrap text-[oklch(0.46_0_0)]">99.2% · 12d</span>
        <span className="ml-auto flex gap-[3px]">
          {[...UPTIME, "ok" as const].map((u, i) => (
            <span key={i} className={cn("size-3 rounded-[3px]", u === "warn" ? "bg-amber-400" : "bg-green-500")} />
          ))}
        </span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { useInView, useReducedMotion } from "motion/react";
import {
  ArrowCounterClockwiseIcon,
  ChartBarIcon,
  FolderIcon,
  GearIcon,
  HeadsetIcon,
  HouseIcon,
  LinkIcon,
  PauseIcon,
  PlayIcon,
  SecurityCameraIcon,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { createDemoClock, DemoClockProvider, useDemo, useDemoClock, useDemoStatus } from "./demo-clock";
import { DemoCursor } from "./demo-cursor";
import { AlertToasts, AnalyticsPage, HomePage, HomeToast, LinkPage, MonitoringPage } from "./demo-pages";
import { CHAPTERS, STAGE, T, between, chapterAt, chapterEnd, pageAt, type Page } from "./demo-script";
import { FOCUS } from "./kit";
import { useFitScale } from "./use-fit-scale";

/* The hero is the dashboard itself, behind glass, and it plays: one pass
   through the product with sample data. A link is shortened, its clicks come
   in, ndle is asked when they land, and then the link breaks, the alert goes
   out, and it comes back. It ends on that link's own page: the clicks and
   the incident, in one place, the page a customer would keep open. The light behind the glass is ndle's: Signal Yellow
   while every link is healthy, red while one is down.

   The storyboard lives in demo-script.ts and the pages in demo-pages.tsx.
   The pane is inert: it is a picture of the product, not a second copy of
   it. The only live controls are under it: the chapters and Replay. */

/** Let the pane finish rising into the hero before the pass starts. */
const AUTOPLAY_DELAY = 900;

export function GlassDashboard() {
  const [clock] = useState(() => createDemoClock(T.end));
  const frameRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const scale = useFitScale(frameRef, STAGE.width);
  const reduce = useReducedMotion();
  const inView = useInView(frameRef, { amount: 0.35 });
  // Paused because it scrolled away, not because someone pressed Pause.
  const autoPaused = useRef(false);

  useEffect(() => () => clock.pause(), [clock]);

  // Plays when it comes into view and pauses when it leaves. With reduced
  // motion it doesn't play on its own: it rests on the last frame, and the
  // chapters step through the settled frames.
  useEffect(() => {
    const status = clock.status();
    if (reduce) {
      if (status === "idle") clock.seek(clock.end);
      return;
    }
    if (!inView) {
      if (status === "playing") {
        autoPaused.current = true;
        clock.pause();
      }
      return;
    }
    if (status === "idle") {
      const id = window.setTimeout(() => clock.play(), AUTOPLAY_DELAY);
      return () => window.clearTimeout(id);
    }
    if (status === "paused" && autoPaused.current) {
      autoPaused.current = false;
      clock.play();
    }
  }, [clock, inView, reduce]);

  const toggle = () => {
    autoPaused.current = false;
    if (clock.status() === "playing") clock.pause();
    else clock.play();
  };

  const jump = (index: number) => {
    autoPaused.current = false;
    if (reduce) {
      clock.seek(chapterEnd(index));
      return;
    }
    clock.seek(CHAPTERS[index].start);
    clock.play();
  };

  return (
    <DemoClockProvider value={clock}>
      <figure>
        <figcaption className="sr-only">
          A 28-second tour of the ndle dashboard with sample data: a long link is shortened, its clicks are
          counted, ndle charts when they land, the link breaks and an alert email goes out, and once it is back
          online the tour ends on the link&apos;s own page with its clicks and incident history.
        </figcaption>
        <div
          ref={frameRef}
          className="relative mx-auto w-full"
          style={{ maxWidth: STAGE.width, aspectRatio: `${STAGE.width} / ${STAGE.height}` }}
        >
          <div
            ref={stageRef}
            className="absolute top-0 left-0 origin-top-left"
            style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${scale})` }}
          >
            <Lights />
            <Pane />
            <DemoCursor stageRef={stageRef} />
          </div>
        </div>
        <Controls onToggle={toggle} onJump={jump} />
      </figure>
    </DemoClockProvider>
  );
}


/* ───────── The light behind the glass ───────── */

function Lights() {
  const down = useDemo((t) => between(t, T.down, T.recovered));
  return (
    <>
      <Glow
        className={cn("transition-opacity duration-700", down ? "opacity-0" : "opacity-100")}
        colors="rgba(255,201,33,0.36) 0%, rgba(255,176,32,0.24) 45%, rgba(255,201,33,0.3) 100%"
      />
      <Glow
        className={cn("transition-opacity duration-700", down ? "opacity-100" : "opacity-0")}
        colors="rgba(239,68,68,0.2) 0%, rgba(249,115,22,0.12) 45%, rgba(239,68,68,0.18) 100%"
      />
    </>
  );
}

/** The blurred pill of light behind the pane, wider than the pane itself. */
function Glow({ colors, className }: { colors: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute top-1/2 left-1/2 h-[calc(100%+40px)] w-[calc(100%+48px)] -translate-x-1/2 -translate-y-1/2 rounded-[48px] blur-[36px]",
        className,
      )}
      style={{ backgroundImage: `linear-gradient(90deg, ${colors})` }}
    />
  );
}

/* ───────── The pane ───────── */

function Pane() {
  const page = useDemo(pageAt);
  return (
    <div
      inert
      aria-hidden
      className="relative flex h-full w-full overflow-hidden rounded-2xl bg-[#f0f0f0]/60 font-mono shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] outline-[0.5px] outline-black/[0.08] backdrop-blur-[24px] backdrop-saturate-150 outline-solid select-none"
    >
      {/* The dashboard, opaque, inside the glass */}
      <div className="relative m-1.5 flex flex-1 overflow-hidden rounded-xl shadow-[0_0_0_0.5px_rgba(0,0,0,0.1),0_10px_30px_-12px_rgba(0,0,0,0.18)]">
        <div className="dot-page absolute inset-0" />
        <Rail page={page} />
        <div className="relative min-w-0 flex-1">
          {page === "home" && <HomePage />}
          {page === "analytics" && <AnalyticsPage />}
          {page === "monitoring" && <MonitoringPage />}
          {page === "link" && <LinkPage />}
        </div>
        <BottomFade />
        <HomeToast />
        <AlertToasts />
      </div>
    </div>
  );
}

/* The page carries on below the glass; let it fade rather than cut. Not where
   a page has reached its end: Analytics scrolled down to the chart builder's
   field, and the link's page, where the pass rests. */
function BottomFade() {
  const atEnd = useDemo((t) => between(t, T.scroll, T.monitoringClick) || t >= T.linkClick);
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[#f6f6f6] transition-opacity duration-500",
        atEnd ? "opacity-0" : "opacity-100",
      )}
    />
  );
}

const RAIL: Array<{
  id: Page | "urls" | "collections";
  Icon: ComponentType<{ className?: string; weight?: "regular" | "duotone" }>;
}> = [
  { id: "home", Icon: HouseIcon },
  { id: "urls", Icon: LinkIcon },
  { id: "collections", Icon: FolderIcon },
  { id: "analytics", Icon: ChartBarIcon },
  { id: "monitoring", Icon: SecurityCameraIcon },
];

/* The sidebar as it is in the app (components/sidebar.tsx), made of frosted
   glass: the dot grid blurs through it. It lights the page on screen. */
function Rail({ page }: { page: Page }) {
  return (
    <aside className="relative my-auto ml-4 flex h-[65%] w-16 shrink-0 flex-col items-center justify-start rounded-sm border border-dashed border-gray-400/60 bg-white/45 py-2 shadow-2xs backdrop-blur-md backdrop-saturate-150">
      <nav className="flex flex-1 flex-col gap-4">
        {RAIL.map(({ id, Icon }) => {
          const on = id === page;
          return (
            <span
              key={id}
              data-demo={`rail-${id}`}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md transition-colors duration-200",
                on ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("size-5", id === "monitoring" && "-scale-x-100")} weight={on ? "duotone" : "regular"} />
            </span>
          );
        })}
      </nav>
      <div className="flex flex-col gap-4">
        <span className="text-muted-foreground flex h-10 w-10 items-center justify-center rounded-md">
          <GearIcon className="size-5" />
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-md">
          <HeadsetIcon className="size-5 text-blue-500" weight="duotone" />
        </span>
      </div>
    </aside>
  );
}

/* ───────── Chapters and Replay ───────── */

function Controls({ onToggle, onJump }: { onToggle: () => void; onJump: (index: number) => void }) {
  const clock = useDemoClock();
  const status = useDemoStatus();
  const chapter = useDemo(chapterAt);
  const fills = useRef<Array<HTMLSpanElement | null>>([]);

  // Progress fills follow the clock every frame; written to the elements
  // directly so the controls don't re-render sixty times a second.
  useLayoutEffect(() => {
    const paint = () => {
      const t = clock.time();
      CHAPTERS.forEach((c, i) => {
        const fill = fills.current[i];
        if (!fill) return;
        const until = CHAPTERS[i + 1]?.start ?? T.end;
        fill.style.transform = `scaleX(${Math.min(1, Math.max(0, (t - c.start) / (until - c.start)))})`;
      });
    };
    paint();
    return clock.subscribe(paint);
  }, [clock]);

  const action =
    status === "playing"
      ? { label: "Pause", Icon: PauseIcon }
      : status === "ended"
        ? { label: "Replay", Icon: ArrowCounterClockwiseIcon }
        : { label: "Play", Icon: PlayIcon };

  return (
    <div className="mt-6 flex flex-col items-center gap-3 font-mono text-xs">
      <div className="flex items-center gap-5">
        <ol aria-label="Chapters" className="hidden items-center gap-4 sm:flex">
          {CHAPTERS.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onJump(i)}
                aria-current={chapter === i ? "step" : undefined}
                className={cn(
                  "flex w-[104px] flex-col gap-2 rounded-sm py-1 text-left transition-colors duration-150",
                  chapter === i ? "text-[var(--fg)]" : "text-[var(--fg-3)] hover:text-[var(--fg-2)]",
                  FOCUS,
                )}
              >
                {c.label}
                <span aria-hidden className="relative h-0.5 overflow-hidden rounded-full bg-black/[0.08]">
                  <span
                    ref={(el) => {
                      fills.current[i] = el;
                    }}
                    className="absolute inset-0 origin-left rounded-full bg-[oklch(0.8_0.16_85)]"
                    style={{ transform: "scaleX(0)" }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--line-2)] bg-white/90 px-2.5 font-medium text-[var(--fg-2)] shadow-xs transition-colors duration-150 hover:bg-white hover:text-[var(--fg)]",
            FOCUS,
          )}
        >
          <action.Icon size={13} weight="bold" />
          {action.label}
        </button>
      </div>
    </div>
  );
}

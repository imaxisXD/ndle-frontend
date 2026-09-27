"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { useQuery } from "convex/react";
import { ChartBarIcon, FolderIcon, SecurityCameraIcon, SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { LiveClickHero } from "@/components/charts/live-click-hero";
import { ClicksChart } from "@/components/charts/clicks-chart";
import { CountryChart } from "@/components/charts/country-chart";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { AskCard } from "./ask-card";
import { AlertInbox } from "./features";
import { DemoFolder } from "./glass-folders";
import { COUNTRY_CLICKS, SAMPLE_COLLECTIONS, WEEKLY_CLICKS } from "./sample-data";
import { StageGlow } from "./stage-glow";

/* A walk through the dashboard, page by page, using the dashboard's own
   components with sample data. The sidebar rail from the app rides along on
   the left and lights the page you are reading, the way it does inside. */

type Stop = { id: string; label: string; Icon: ComponentType<{ size?: number; weight?: "regular" | "duotone" }> };

const STOPS: Stop[] = [
  { id: "analytics", label: "Analytics", Icon: ChartBarIcon },
  { id: "collections", label: "Collections", Icon: FolderIcon },
  { id: "ask", label: "Ask AI", Icon: SparkleIcon },
  { id: "incident", label: "Alerts", Icon: SecurityCameraIcon },
];

export function AppTour() {
  const [active, setActive] = useState(STOPS[0].id);

  // The lit stop is the last one whose top has passed the middle of the screen.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.45;
      let current = STOPS[0].id;
      for (const stop of STOPS) {
        const el = document.getElementById(stop.id);
        if (el && el.getBoundingClientRect().top <= line) current = stop.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="mx-auto grid max-w-[1240px] gap-8 px-5 sm:px-8 lg:grid-cols-[64px_minmax(0,1fr)] lg:gap-14">
      <nav aria-label="Dashboard pages" className="sticky top-24 hidden self-start lg:block">
        <div className="flex w-16 flex-col items-center gap-4 rounded-sm border border-dashed border-gray-400/60 bg-white py-3 shadow-2xs">
          {STOPS.map(({ id, label, Icon }) => {
            const on = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                aria-label={label}
                aria-current={on ? "true" : undefined}
                title={label}
                className={cn(
                  "flex size-10 items-center justify-center rounded-md transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-[oklch(0.86_0.17_88/0.5)] focus-visible:outline-none",
                  on ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon size={20} weight={on ? "duotone" : "regular"} />
              </a>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0 space-y-28 lg:space-y-36">
        <Stop
          id="analytics"
          title="Every click, counted as it lands."
          body="Clicks by day, country, device, referrer and UTM campaign. Filter by any of them."
        >
          <AnalyticsDemo />
        </Stop>

        <Stop
          id="collections"
          title="Folders that show what's inside."
          body="Group links by launch, client or campaign. Each folder shows its newest links."
        >
          <CollectionsDemo />
        </Stop>

        <Stop
          id="ask"
          title="Ask your links a question."
          body="Describe a chart in plain words, and ndle draws it from your clicks."
        >
          <AskDemo />
        </Stop>

        <Stop
          id="incident"
          title="It breaks at 3:04 AM."
          sub="You know by 3:05."
          body="An expired certificate, a 503, a deleted page: when a destination fails, you get an email within a minute, and another when it's back."
          aside
        >
          <AlertInbox />
        </Stop>
      </div>
    </div>
  );
}

function Stop({
  id,
  title,
  sub,
  body,
  aside = false,
  children,
}: {
  id: string;
  title: string;
  sub?: string;
  body: string;
  /** Put the copy beside the visual instead of above it. */
  aside?: boolean;
  children: ReactNode;
}) {
  const head = (
    <div className={cn(aside ? "" : "grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)] lg:items-end lg:gap-12")}>
      <h2 id={`${id}-title`} className="text-[clamp(1.9rem,3.2vw,2.5rem)] leading-[1.1] font-medium tracking-[-0.025em] text-balance">
        <span className="text-[var(--fg)]">{title}</span>
        {sub && <span className="block text-[var(--fg-3)]">{sub}</span>}
      </h2>
      <p className={cn("max-w-[48ch] text-base leading-7 text-[var(--fg-2)]", aside && "mt-5")}>{body}</p>
    </div>
  );
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      {aside ? (
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:order-2">{head}</div>
          <div className="lg:order-1">{children}</div>
        </div>
      ) : (
        <>
          {head}
          <div className="mt-10">{children}</div>
        </>
      )}
    </section>
  );
}

/* The counter is live: every click ndle has counted, across all links, read
   from a public total that refreshes once a minute. Between refreshes it
   eases up to the new total, so it keeps moving without running ahead of
   the real number. Until that total exists it falls back to a sample count. */
function AnalyticsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.2 });
  const reduce = useReducedMotion();
  const live = useQuery(api.publicStats.getLiveClickTotal);
  const target = live?.total ?? null;
  const [shown, setShown] = useState<number | null>(null);
  const [sample, setSample] = useState(48_213);

  useEffect(() => {
    if (target === null) return;
    if (reduce || shown === null || target < shown) {
      setShown(target);
      return;
    }
    if (target === shown) return;
    const id = window.setTimeout(
      () => setShown((s) => (s === null ? target : Math.min(target, s + Math.max(1, Math.round((target - s) * 0.12))))),
      700,
    );
    return () => window.clearTimeout(id);
  }, [target, shown, reduce]);

  useEffect(() => {
    if (live !== null || !inView || reduce) return;
    const id = window.setInterval(() => setSample((c) => c + 1 + Math.floor(Math.random() * 4)), 1600);
    return () => window.clearInterval(id);
  }, [live, inView, reduce]);

  const isLive = target !== null;

  return (
    <div ref={ref} className="relative isolate">
      <StageGlow className="-inset-x-10 -inset-y-8 -z-10 opacity-50" />
      <div className="space-y-4">
        <LiveClickHero counterValue={isLive ? (shown ?? target) : live === undefined ? 0 : sample} />
        <div className="grid gap-4 lg:grid-cols-2">
          <ClicksChart data={WEEKLY_CLICKS} />
          <CountryChart data={COUNTRY_CLICKS} />
        </div>
      </div>
      <p className="mt-4 flex min-h-4 items-center gap-2 font-mono text-xs text-[var(--fg-3)]">
        {isLive && (
          <>
            <span className="animate-live-blip size-1.5 rounded-full bg-green-500" />
            Live count of every click on ndle.
          </>
        )}
      </p>
    </div>
  );
}

const FOLDER_COLORS = ["#141312", "#ffc921", "#6b9be8"];
const FOLDER_TILTS = [-5, 3, -3];

/* On first sight the folders open one after another, then hand control to
   the pointer. */
function CollectionsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [opening, setOpening] = useState<number | null>(null);

  useEffect(() => {
    if (!inView || reduce) return;
    const timers = [0, 1, 2].map((i) => window.setTimeout(() => setOpening(i), 300 + i * 650));
    timers.push(window.setTimeout(() => setOpening(null), 300 + 3 * 650));
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduce]);

  return (
    <div ref={ref}>
      <div className="flex flex-wrap items-start justify-center gap-x-12 gap-y-16 pt-12 lg:justify-between lg:gap-x-6 lg:px-2">
        {SAMPLE_COLLECTIONS.map((c, i) => (
          <div key={c.name} className={cn(i === 1 && "lg:translate-y-10")}>
            <DemoFolder
              name={c.name}
              count={c.count}
              urls={c.urls}
              color={FOLDER_COLORS[i]}
              tilt={FOLDER_TILTS[i]}
              open={opening === i ? true : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* The question is already asked; ndle thinks for a beat, then answers. */
function AskDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setAnswered(true);
      return;
    }
    const id = window.setTimeout(() => setAnswered(true), 1400);
    return () => window.clearTimeout(id);
  }, [inView, reduce]);

  return (
    <div ref={ref}>
      <AskCard answered={answered} />
    </div>
  );
}

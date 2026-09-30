"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowsSplitIcon,
  DownloadSimpleIcon,
  QrCodeIcon,
  ScanIcon,
  SecurityCameraIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card";
import { BklitHorizontalBarChart } from "@/components/charts/bklit-chart-kit";
import { GlassFolder } from "@/components/collection/glass-folder";
import { DoodleCurlArrow, Handwritten } from "@/components/doodle-icons";
import { LinkWithFavicon } from "@/components/ui/link-with-favicon";
import { getBrandBadgeDataUrl } from "@/lib/qr";
import { cn } from "@/lib/utils";
import { ASK, AskCard } from "./ask-card";
import { PointerGlyph } from "./demo-cursor";
import { bebas } from "./fonts";
import { LinkDoodle } from "./dot-doodles";
import { ActionLink, FOCUS, INK_TITLE } from "./kit";
import { CAMPAIGN_BARS, SAMPLE_COLLECTIONS, SHORT_DOMAIN, sampleFavicon } from "./sample-data";
import { LinkAlertToasts } from "./toast";
import { useLoopTime, useStillAfterMount } from "./use-loop-time";

/* The features as a comic page, after capy.ai's Use cases: six panels in
   two columns, outlined in 2px ink. The first row is square; the gutters of
   the second row lean left and the third lean right, so the page zig-zags.
   In every stage the product window sits low and to the right, framed the
   way capy frames its windows: a 2px ink edge and a hard ink shadow
   dropped down and to the right.

   From ndle: the windows are the dashboard's own pieces with sample data,
   the alerts are the hero demo's black toasts, the accent is Signal Yellow,
   the pointer is the hero demo's, and the margins carry the hand-written
   notes of ndle's sketches.

   Geometry is capy's, drawn on a 1130 × 1395 page (PAGE). Each panel is
   placed at its outline's bounding box and cut to the outline with a
   percentage polygon; one SVG draws every outline on top with a 2px
   non-scaling stroke. The page needs xl's width to hold its words, as
   capy's does; below it the panels fall into a grid of plain ink boxes,
   two columns from sm, one on phones.

   Stages are pictures, not controls: inert. The QR code's is the exception:
   its options work, as they do in the link form. Each loops while it's in
   view and stops when it leaves; with reduced motion it rests on its last
   frame. The charts draw once. */

/* ─────────────────────────────────────────────────────────
 * STORYBOARD   (ms into each panel's loop)
 *
 *  Collections   (6000ms loop)
 *      300ms   pointer on the first folder; it fans open
 *     +650ms   …then the next, and the next
 *     2250ms   all close; the pointer rests on the middle one
 *
 *  Ask AI   (11000ms loop)
 *      500ms   pointer to the question field; click at 1000ms
 *     1100ms   the question types in (35ms a character)
 *     2700ms   pointer to send; click at 3200ms, the question posts
 *     4400ms   the answer lands and the hourly bars draw
 *
 *  Alerts   (9000ms loop)
 *      900ms   /launch is being checked…
 *     1400ms   …and fails: its row turns red, the DOWN toast pops up
 *     4400ms   back: the row clears, RECOVERED pops up in front
 *     7600ms   both toasts go
 *
 *  QR code   (7500ms loop, until the visitor touches the panel)
 *      0 / 2500 / 5000ms   pointer picks the next colour; the code
 *                           redraws in it. Once the panel's touched, the
 *                           pointer goes and the options are theirs
 *
 *  Campaigns, A/B split    200ms after first view, the bars draw once
 * ───────────────────────────────────────────────────────── */

const LOOP = { collections: 6000, ask: 11000, alerts: 9000, qr: 7500 };

const T = {
  folderFirst: 300,     // first folder opens
  folderEvery: 650,     // the next opens after this
  askToField: 500,      // pointer heads for the field
  askFocus: 1000,       // click: the field focuses
  askType: 1100,        // the question types in
  askTypeEvery: 35,     // ms a character
  askToSend: 2700,      // pointer heads for send
  askSend: 3200,        // click: the question posts
  askAnswer: 4400,      // ndle answers
  alertCheck: 900,      // /launch is being checked
  alertDown: 1400,      // it fails; DOWN toast
  alertBack: 4400,      // it's back; RECOVERED toast
  alertClear: 7600,     // toasts go
  qrEvery: 2500,        // next colour
  chartsDraw: 200,      // campaign and variant bars mount and draw
  pressMs: 220,         // a pointer click, down and up
};

/* ───────── The page ───────── */

const PAGE = { width: 1130, height: 1395 } as const;

/* Each outline's corners on the page, clockwise from top-left. The first
   row's panels are rectangles; the others share a slanted edge with their
   neighbour across a 26-unit gutter. */
const PANELS = {
  collections: [[1.5, 1.5], [516.8, 1.5], [516.8, 477.3], [1.5, 477.3]],
  ask: [[542, 1.5], [1128.5, 1.5], [1128.5, 477.3], [542, 477.3]],
  alerts: [[1.5, 506.3], [621.4, 506.3], [551.1, 884.5], [1.5, 884.5]],
  campaigns: [[647.2, 506.3], [1128.5, 506.3], [1128.5, 884.5], [577, 884.5]],
  split: [[1.5, 913.5], [545.8, 913.5], [649.8, 1393.1], [1.5, 1393.1]],
  qr: [[574.2, 913.5], [1128.5, 913.5], [1128.5, 1393.1], [678.2, 1393.1]],
} satisfies Record<string, Array<[number, number]>>;

type PanelId = keyof typeof PANELS;

const OUTLINES = Object.values(PANELS)
  .map((pts) => `M${pts.map(([x, y]) => `${x} ${y}`).join("L")}Z`)
  .join("");

const pct = (n: number) => `${+(n * 100).toFixed(3)}%`;

/** Where a panel sits on the page, and its outline as a polygon of its box. */
function placement(id: PanelId): CSSProperties {
  const pts = PANELS[id];
  const xs = pts.map(([x]) => x);
  const ys = pts.map(([, y]) => y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const polygon = pts.map(([x, y]) => `${pct((x - x0) / (x1 - x0))} ${pct((y - y0) / (y1 - y0))}`).join(", ");
  return {
    "--x": pct(x0 / PAGE.width),
    "--y": pct(y0 / PAGE.height),
    "--w": pct((x1 - x0) / PAGE.width),
    "--h": pct((y1 - y0) / PAGE.height),
    "--clip": `polygon(${polygon})`,
  } as CSSProperties;
}

/** A product window on a stage, framed like capy's: white, a 2px ink edge,
    and a hard ink shadow dropped down and to the right. Its content crops
    inside it, so the frame always shows. */
const WINDOW = "overflow-hidden rounded-[12px] border-2 border-[#141312] bg-white shadow-[3px_4px_0_0_#141312]";

/** The other way capy frames a window (its Native Review UI): pushed to the
    right and running off the stage's right and bottom edges, so only its top
    and left show, the left drawn heavier. */
const WINDOW_BLEED = "overflow-hidden rounded-tl-[12px] border-t-2 border-l-[4px] border-[#141312] bg-white";

/* The tour's folder colours, so the two views of Collections match. */
const FOLDERS = {
  colors: ["#141312", "#ffc921", "#6b9be8"],
  tilts: [-6, 2, 7],
  lift: [0, 14, 30],     // px each folder sits lower, stepping down to the right
  pointer: [22, 54, 86], // % across the stage, over each folder
};

/* Where the call to action goes; the same target as the page's nav. */
const SIGN_UP = "/sign-up?redirect_url=/dashboard";


/** For the charts: true once the stage has been half in view for `at` ms. */
function useDrawnOnce(at: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDrawn(true);
      return;
    }
    const id = window.setTimeout(() => setDrawn(true), at);
    return () => window.clearTimeout(id);
  }, [inView, reduce, at]);

  return { ref, drawn };
}

export function FeatureBento({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <section
      id="features"
      aria-labelledby="features-title"
      className={cn(bebas.variable, "mx-auto max-w-[1240px] scroll-mt-24 px-5 pb-28 sm:px-8 lg:pb-36")}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {/* The drawing on the title's line, leading into it */}
          <div className="flex items-center gap-3">
            <LinkDoodle color="blue" className="size-12 shrink-0 sm:size-14" />
            <h2 id="features-title" className={INK_TITLE}>
              Everything a link needs
            </h2>
          </div>
          <p className="mt-4 max-w-[44ch] font-mono text-[17px] leading-[1.45] text-[#141312]">
            Folders for every launch, charts you ask for in plain words, an email when a link breaks, and the numbers
            behind every campaign.
          </p>
        </div>
        <ActionLink href={signedIn ? "/dashboard" : SIGN_UP} className="self-start lg:self-end">
          {signedIn ? "Open your dashboard" : "Get ndle free"}
        </ActionLink>
      </div>

      <div className="relative mt-10 grid gap-6 sm:grid-cols-2 xl:block xl:aspect-[1130/1395]">
        <Panel
          id="collections"
          title="Folders that show what's inside"
          body="Group links by launch, client or campaign. Each folder shows its newest links at a glance."
          stageClassName="h-[250px] sm:h-[300px]"
        >
          <CollectionsStage />
        </Panel>
        <Panel
          id="ask"
          title="Ask ndle about your links"
          body="Describe the chart you want in plain words, and ndle draws it from your clicks."
          // On phones the answer wraps to more lines; the stage grows so the chart still shows.
          stageClassName="h-[420px] sm:h-[360px]"
        >
          <AskStage />
        </Panel>
        <Panel
          id="alerts"
          title="An email when a link breaks"
          body="A deleted page or an expired certificate: you hear about it, and again when it's back."
          stageClassName="h-[280px]"
          textClassName="xl:pr-24"
        >
          <AlertsStage />
        </Panel>
        <Panel
          id="campaigns"
          title="See which campaign sent the click"
          body="Clicks by utm_campaign, source and medium, with a UTM builder on every link."
          stageClassName="h-[280px]"
          // The slant cuts this panel's top left; its words sit right, as capy's do.
          textClassName="xl:items-end xl:text-right"
        >
          <CampaignsStage />
        </Panel>
        <Panel
          id="split"
          title="Split one link between pages"
          body="Send a share of the clicks to each destination and see which page earns more."
          // As tall as the QR panel's stage beside it
          stageClassName="h-[300px] sm:h-[330px]"
        >
          <SplitStage />
        </Panel>
        <Panel
          id="qr"
          title="A QR code for every link"
          // Two lines, like the split panel's beside it, so the two stages end level
          body="ndle puts its badge in the middle. Pick the colors and download SVG or PNG."
          // Its options run tall, so its stage (and the split panel's beside it) does too
          stageClassName="h-[330px]"
          live
          // The slant cuts this panel's bottom left, where the words are; they sit right.
          textClassName="xl:items-end xl:text-right"
        >
          <QrStage />
        </Panel>

        {/* Every outline in one stroke, on top of the panels, as capy draws them. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden size-full xl:block"
          viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}
          preserveAspectRatio="none"
          fill="none"
        >
          <path d={OUTLINES} stroke="#141312" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </section>
  );
}

/* A panel: the grey stage with its window, then the title and one line of
   mono. Below xl it's an ink box in a one- or two-column grid; from xl it's
   placed on the page and cut to its outline, and the page's SVG draws the
   ink. */
/* The nav's anchors land on their panels. */
const ANCHORS: Partial<Record<PanelId, string>> = { collections: "collections", campaigns: "analytics", alerts: "monitoring" };

function Panel({
  id,
  title,
  body,
  stageClassName,
  textClassName,
  live = false,
  children,
}: {
  id: PanelId;
  title: string;
  body: string;
  /** Stage height when stacked; from xl the stage fills what the words leave. */
  stageClassName?: string;
  /** Padding or alignment where a slanted edge cuts into the words. */
  textClassName?: string;
  /** The stage's controls work: it isn't just a picture. */
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      id={ANCHORS[id]}
      style={placement(id)}
      className="flex scroll-mt-24 flex-col overflow-hidden border-2 border-[#141312] bg-white xl:absolute xl:top-[var(--y)] xl:left-[var(--x)] xl:h-[var(--h)] xl:w-[var(--w)] xl:border-0 xl:[clip-path:var(--clip)]"
    >
      <div
        inert={!live}
        aria-hidden={live ? undefined : true}
        className={cn(
          "dot-page relative shrink-0 overflow-hidden font-mono xl:h-auto xl:min-h-0 xl:flex-1",
          !live && "select-none",
          stageClassName,
        )}
      >
        {children}
      </div>
      <div className={cn("flex flex-col px-7 pt-6 pb-7", textClassName)}>
        <h3 className="font-[family-name:var(--font-bebas)] text-[34px] leading-[0.95] tracking-[-0.005em] text-[#141312] uppercase xl:text-[40px]">
          {title}
        </h3>
        <p className="mt-2.5 max-w-[44ch] font-mono text-[15px] leading-[1.45] text-pretty text-[#3d3d3d]">{body}</p>
      </div>
    </article>
  );
}

/** A hand-written margin note, as in ndle's sketches. */
function Note({ children, className, tilt = -3 }: { children: ReactNode; className?: string; tilt?: number }) {
  return (
    <Handwritten tilt={tilt} className={cn("absolute text-[22px] text-[#141312]", className)}>
      {children}
    </Handwritten>
  );
}

/* The hero demo's pointer, on a stage. It glides to the centre of a
   `data-demo` target inside the stage (measured when the target changes),
   or to a resting point given in percent, and dips when `press` changes. */
function StagePointer({
  stageRef,
  target,
  rest,
  press,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  target: string | null;
  /** Where it waits, as % of the stage, when there's no target. */
  rest: { x: number; y: number };
  /** Bumped on every click; -1 for none. */
  press: number;
}) {
  const [at, setAt] = useState<{ x: string; y: string }>({ x: `${rest.x}%`, y: `${rest.y}%` });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const el = target ? stage?.querySelector<HTMLElement>(`[data-demo="${target}"]`) : null;
    if (!stage || !el) {
      setAt({ x: `${rest.x}%`, y: `${rest.y}%` });
      return;
    }
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setAt({ x: `${r.left - s.left + r.width / 2}px`, y: `${r.top - s.top + r.height / 2}px` });
  }, [stageRef, target, rest.x, rest.y]);

  return (
    <span
      className="pointer-events-none absolute z-20 transition-[left,top] duration-[600ms] ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
      style={{ left: at.x, top: at.y }}
    >
      {press >= 0 && <span key={`ripple-${press}`} className="h2-ripple absolute -top-3.5 -left-3.5 size-7 rounded-full" />}
      <PointerGlyph key={`arrow-${press}`} className={cn(press >= 0 && "h2-press")} />
    </span>
  );
}

/** Index of the latest click at or before `t` that's still pressing, or -1. */
function pressAt(clicks: readonly number[], t: number) {
  for (let i = clicks.length - 1; i >= 0; i--) {
    if (t >= clicks[i]) return t - clicks[i] < 450 ? i : -1;
  }
  return -1;
}

/* ───────── Collections: a pile of glass folders, low and to the right ───────── */

const MemoFolder = memo(GlassFolder);

function CollectionsStage() {
  const { ref, t } = useLoopTime(LOOP.collections, -1);
  const step = t < T.folderFirst ? -1 : Math.floor((t - T.folderFirst) / T.folderEvery);
  const opening = step >= 0 && step < 3 ? step : null;
  // Before a pass and after it, the pointer rests over the middle folder.
  const pointerAt = FOLDERS.pointer[opening ?? 1];

  return (
    <div ref={ref} className="absolute inset-0">
      {/* Widths in percent, so the pile scales with the panel; the last folder
          runs off the right edge. */}
      <div className="absolute top-[26%] -right-[14%] left-[10%] flex items-start gap-[3%]">
        {SAMPLE_COLLECTIONS.map((c, i) => (
          <span key={c.name} className="block w-[36%] shrink-0" style={{ marginTop: FOLDERS.lift[i] }}>
            <MemoFolder
              previewUrls={c.urls}
              color={FOLDERS.colors[i]}
              label={c.name}
              meta={`${c.count} links`}
              tilt={FOLDERS.tilts[i]}
              hovered={opening === i}
              open={opening === i}
            />
          </span>
        ))}
      </div>
      <span
        className="absolute top-[80%] z-10 hidden transition-[left] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] sm:block"
        style={{ left: `${pointerAt}%` }}
      >
        <PointerGlyph />
      </span>
      <Note className="top-6 left-7 hidden sm:block">newest links peek out</Note>
      <DoodleCurlArrow width={46} className="absolute top-11 left-[210px] hidden rotate-[8deg] text-[#141312] sm:block" />
    </div>
  );
}

/* ───────── Ask AI: the question typed, sent and answered ───────── */

const MemoAskCard = memo(AskCard);

function AskStage() {
  const { ref, t } = useLoopTime(LOOP.ask);
  const chars = t < T.askType ? 0 : Math.floor((t - T.askType) / T.askTypeEvery) + 1;
  const asked = t >= T.askSend;
  const draft = asked ? "" : ASK.question.slice(0, chars);
  const focused = t >= T.askFocus && !asked;
  const answered = t >= T.askAnswer;
  const target = t >= T.askToSend && t < T.askAnswer ? "ask-send" : t >= T.askToField && t < T.askToSend ? "ask-field" : null;

  return (
    <div ref={ref} className="absolute inset-0">
      <div className="absolute top-[6%] right-[5%] bottom-[5%] left-[9%]">
        {/* Once the question posts, the field makes room for the answer. */}
        <MemoAskCard
          compact
          hideField={asked}
          draft={draft}
          focused={focused}
          asked={asked}
          answered={answered}
          className={cn(WINDOW, "h-full")}
        />
      </div>
      <StagePointer stageRef={ref} target={target} rest={{ x: 84, y: 82 }} press={pressAt([T.askFocus, T.askSend], t)} />
    </div>
  );
}

/* ───────── Alerts: /launch breaks on Monitoring, and the toasts pop up ───────── */

const WATCHED = [
  { slug: "launch", destination: "https://acme.com/launch-week", latency: "142ms" },
  { slug: "docs", destination: "https://notion.so/acme/docs", latency: "88ms" },
  { slug: "repo", destination: "https://github.com/acme/app", latency: "64ms" },
];

function AlertsStage() {
  // Held still, it shows both alerts: the outage tucked behind the recovery.
  const { ref, t } = useLoopTime(LOOP.alerts, T.alertBack + 500);
  const checking = t >= T.alertCheck && t < T.alertDown;
  const down = t >= T.alertDown && t < T.alertBack;
  const toasts = { down: t >= T.alertDown && t < T.alertClear, up: t >= T.alertBack && t < T.alertClear };

  return (
    <div ref={ref} className="absolute inset-0">
      <div className={cn(WINDOW, "absolute top-[18%] right-[16%] bottom-[10%] left-[8%]")}>
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium text-zinc-700">
          <SecurityCameraIcon size={15} className="-scale-x-100" />
          Link Monitoring
          <span className="ml-auto text-zinc-400">3 links</span>
        </div>
        {WATCHED.map((row) => {
          const broken = row.slug === "launch" && down;
          return (
            <div
              key={row.slug}
              className={cn(
                "flex items-center gap-3 border-t border-zinc-100 px-4 py-2 transition-colors duration-500 first-of-type:border-t-0",
                broken && "bg-red-50/80",
              )}
            >
              <Badge key={broken ? "error" : "healthy"} variant={broken ? "red" : "green"} className="w-[62px] shrink-0 justify-center capitalize">
                {broken ? "error" : "healthy"}
              </Badge>
              <span className="min-w-0 flex-1">
                <LinkWithFavicon url={`https://${SHORT_DOMAIN}/${row.slug}`} originalUrl={row.destination} faviconSrc={sampleFavicon(row.destination)} tabIndex={-1} size="sm" />
              </span>
              <span className={cn("shrink-0 text-xs tabular-nums", broken ? "text-red-600" : "text-green-600")}>
                {row.slug === "launch" && checking ? "checking…" : broken ? "404" : row.latency}
              </span>
            </div>
          );
        })}
      </div>
      {/* The hero demo's black toasts, clear of this panel's slanted right edge. */}
      <LinkAlertToasts down={toasts.down} up={toasts.up} className="right-4 bottom-4 w-[min(340px,calc(100%-2rem))] xl:right-[64px]" />
      <Note className="top-4 left-7" tilt={-2}>
        while you sleep
      </Note>
    </div>
  );
}

/* ───────── Campaigns: the Analytics page's campaign card ───────── */

const CAMPAIGNS = CAMPAIGN_BARS.map(({ name, clicks }) => ({ campaign: name, clicks }));

function CampaignsStage() {
  const { ref, drawn } = useDrawnOnce(T.chartsDraw);
  return (
    <div ref={ref} className="absolute top-[14%] right-[5%] bottom-[9%] left-[20%]">
      <Card className={cn(WINDOW, "h-full")}>
        <CardHeader className="shrink-0 py-3.5">
          <CardTitle className="text-base">Campaign Performance</CardTitle>
          <CardDescription>Clicks by utm_campaign parameter</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Mounted on view, so the bars draw in front of the reader. */}
          {drawn ? (
            <BklitHorizontalBarChart data={CAMPAIGNS} heightClassName="h-[200px]" labelKey="campaign" labelWidth={96} valueKey="clicks" />
          ) : (
            <div className="h-[200px]" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── A/B split: the link page's variant card ───────── */

/* The link page's "A/B Test Performance" card, drawn with the same chart, at
   a height where both variants and their pages fit the stage. */
/* One link, its visitors split half and half between two pages. A is the
   link's own page, B the page it's tested against. */
const VARIANTS = [
  { label: "Variant A", clicks: 1204, url: "acme.com/pricing", share: 50 },
  { label: "Variant B", clicks: 1388, url: "acme.com/pricing-v2", share: 50 },
];

function SplitStage() {
  const { ref, drawn } = useDrawnOnce(T.chartsDraw);
  return (
    // Clear of this panel's right edge, which leans in toward the top.
    <div ref={ref} className="absolute top-[14%] right-[22%] bottom-[9%] left-[8%] sm:right-[12%] xl:right-[22%]">
      <Card className={cn(WINDOW, "h-full")}>
        <CardHeader className="flex shrink-0 flex-col items-start justify-between gap-1.5 py-3.5">
          <CardTitle className="flex items-center gap-2 font-medium">
            {/* One path in, two out: the link, split between two pages */}
            <ArrowsSplitIcon aria-hidden className="size-5 -rotate-90" weight="bold" />
            A/B Test Performance
          </CardTitle>
          <CardDescription className="text-xs">Click distribution across variants</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {drawn ? (
            <BklitHorizontalBarChart barWidth={24} data={VARIANTS} heightClassName="h-[96px]" labelKey="label" labelWidth={80} valueKey="clicks" />
          ) : (
            <div className="h-[96px]" />
          )}
          <ul className="mt-3 space-y-1.5 text-xs">
            {VARIANTS.map((v) => (
              <li key={v.label} className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-2">
                <span className="font-medium">{v.label}</span>
                <span className="text-muted-foreground truncate">{v.url}</span>
                <span className="text-muted-foreground tabular-nums">{v.share}% of visitors</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

/* ───────── QR code: the link form's QR options, and they work ───────── */

/* What a free account gets in the link form: the code's colour, its
   background, ndle's badge in the middle (always, on free codes), and SVG
   or PNG. ndle's Signal Yellow is a background, and the one the code starts
   on: yellow dots on white are too faint for a camera to read, and every
   colour here scans on it. The pointer picks colours until the visitor
   touches the panel; from then on the options are theirs, and the
   downloads are the code as shown. */

const QR = {
  colors: [
    { value: "#141312", name: "Ink" },
    { value: "#2563eb", name: "Blue" },
    { value: "#7c3aed", name: "Violet" },
    { value: "#047857", name: "Green" },
    { value: "#dc2626", name: "Red" },
    { value: "#be185d", name: "Pink" },
  ],
  backgrounds: [
    { value: "#ffc921", name: "ndle yellow" }, // Signal Yellow, oklch(0.86 0.17 88)
    { value: "#ffffff", name: "White" },
    { value: "transparent", name: "Clear" },
  ],
  /** px the code is drawn at in the panel; it scales down with the panel. */
  shown: 132,
  /** px the downloads are drawn at; the PNG doubles it. */
  export: 512,
  demoPicks: 3, // colours the pointer runs through before anyone touches it
};

const QR_LINK = `${SHORT_DOMAIN}/launch`;

/* A light checker, for a clear background: what shows where the code has no fill. */
const CHECKER: CSSProperties = {
  backgroundImage: "repeating-conic-gradient(#e7e5e4 0% 25%, #ffffff 0% 50%)",
  backgroundSize: "10px 10px",
};

/* A real, scannable code for the sample link, with ndle's badge. */
const Qr = memo(function Qr({ color, bg, size, title }: { color: string; bg: string; size: number; title?: string }) {
  return (
    <QRCodeSVG
      title={title}
      value={`https://${QR_LINK}`}
      size={size}
      level="H"
      fgColor={color}
      bgColor={bg}
      marginSize={1}
      imageSettings={{ src: getBrandBadgeDataUrl(color), width: size * 0.2, height: size * 0.2, excavate: true }}
      style={{ width: "100%", height: "100%" }}
    />
  );
});

/** The code shown in `holder`, as SVG markup at `size` px. */
function qrMarkup(holder: HTMLElement | null, size: number) {
  const svg = holder?.querySelector("svg");
  if (!svg) return null;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("style");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  return new XMLSerializer().serializeToString(clone);
}

function save(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

async function downloadQr(holder: HTMLElement | null, format: "svg" | "png") {
  const markup = qrMarkup(holder, QR.export);
  if (!markup) return;
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    if (format === "svg") return save(url, "launch-qr.svg");
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = QR.export * 2;
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    save(canvas.toDataURL("image/png"), "launch-qr.png");
  } finally {
    // Long enough for the download to have started
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function QrStage() {
  const { ref, t } = useLoopTime(LOOP.qr, 0);
  const still = useStillAfterMount();
  // Once the visitor touches the panel, the pointer goes and the options are theirs.
  const [taken, setTaken] = useState(false);
  const [color, setColor] = useState(QR.colors[0].value);
  const [bg, setBg] = useState(QR.backgrounds[0].value);
  const codeRef = useRef<HTMLDivElement>(null);

  const pick = t < 0 ? 0 : Math.min(QR.demoPicks - 1, Math.floor(t / T.qrEvery));
  const shownColor = taken ? color : QR.colors[pick].value;
  const clear = bg === "transparent";
  const take = () => {
    if (taken) return;
    setColor(shownColor);
    setTaken(true);
  };

  return (
    <div ref={ref} className="absolute inset-0">
      {/* To the right, off the right and bottom edges. From lg it's only as
          wide as what's in it, so it sits over to the right with no empty
          space inside, and never wider than 80% of the panel. */}
      <div
        className={cn(WINDOW_BLEED, "absolute top-[22%] -right-px -bottom-px left-[7%] lg:left-auto lg:w-max lg:max-w-[80%]")}
        onPointerDownCapture={take}
        onKeyDownCapture={take}
        onFocusCapture={take}
      >
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-5 py-2.5 text-xs font-medium whitespace-nowrap text-zinc-700">
          <QrCodeIcon aria-hidden size={15} />
          QR Code
          <span className="truncate font-normal text-zinc-400">· {QR_LINK}</span>
        </div>

        {/* More room inside from xl, where the panel is wide enough for it.
            sm is two panels to a row at their narrowest: a smaller code and
            tighter swatches keep each option on one line */}
        <div className="relative flex items-start gap-4 px-4 pt-4 sm:gap-3 sm:px-3 md:gap-4 md:px-4 lg:gap-5 lg:px-5 xl:gap-7 xl:px-6 xl:pt-5">
          <div className="shrink-0">
            <div ref={codeRef} className="size-[104px] sm:size-[84px] md:size-[104px] lg:size-[132px]" style={clear ? CHECKER : undefined}>
              <Qr color={shownColor} bg={bg} size={QR.shown} title={`QR code for ${QR_LINK}`} />
            </div>
            {/* No room for it under the smaller code */}
            <p className="mt-2 hidden items-center gap-1 text-[11px] text-zinc-500 lg:flex">
              <ScanIcon aria-hidden size={12} />
              scans to /launch
            </p>
          </div>

          <div className="min-w-0 space-y-2.5 text-xs xl:space-y-3">
            <QrChoice
              legend="Color"
              name="qr-color"
              options={QR.colors}
              value={shownColor}
              onChange={setColor}
              demoIndex={taken || t < 0 ? -1 : pick}
            />
            <QrChoice legend="Background" name="qr-bg" options={QR.backgrounds} value={bg} onChange={setBg} demoIndex={-1} />
            <div>
              <p className="mb-1 text-zinc-500 xl:mb-1.5">Center</p>
              <p className="flex items-center gap-1.5 text-zinc-900">
                <span aria-hidden className="flex size-3.5 items-center justify-center rounded-full border border-zinc-900">
                  <span className="size-1.5 rounded-full bg-zinc-900" />
                </span>
                ndle badge
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">on every free code</p>
            </div>
            <div className="flex gap-2">
              {(["svg", "png"] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => void downloadQr(codeRef.current, format)}
                  aria-label={`Download the QR code as ${format.toUpperCase()}`}
                  className={cn(
                    "border-border flex h-7 items-center gap-1.5 rounded-md border bg-white px-2.5 text-zinc-900 shadow-xs transition-colors duration-150 hover:bg-zinc-50 active:scale-[0.97]",
                    FOCUS,
                  )}
                >
                  <DownloadSimpleIcon aria-hidden size={12} />
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
      {!taken && !still && (
        <StagePointer
          stageRef={ref}
          target={t < 0 ? null : `qr-color-${pick}`}
          rest={{ x: 70, y: 60 }}
          press={pressAt([0, T.qrEvery, 2 * T.qrEvery], t)}
        />
      )}
      <Note className="top-4 left-9" tilt={-2}>
        it scans, try it
      </Note>
      <DoodleCurlArrow aria-hidden width={40} className="absolute top-[13%] left-[26%] rotate-[4deg] text-[#141312]" />
    </div>
  );
}

/** One of the panel's option rows: a label and its swatches, as radios. */
function QrChoice({
  legend,
  name,
  options,
  value,
  onChange,
  demoIndex,
}: {
  legend: string;
  name: string;
  options: ReadonlyArray<{ value: string; name: string }>;
  value: string;
  onChange: (value: string) => void;
  /** The swatch the demo pointer is on, or -1. */
  demoIndex: number;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-zinc-500 xl:mb-1.5">{legend}</legend>
      <div className="flex flex-wrap gap-1.5 sm:gap-1 md:gap-1.5 xl:gap-2">
        {options.map((option, i) => {
          const on = option.value === value;
          const clear = option.value === "transparent";
          return (
            <label key={option.value} className="relative cursor-pointer" title={option.name}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={on}
                onChange={() => onChange(option.value)}
                className="peer sr-only"
              />
              <span className="sr-only">{option.name}</span>
              <span
                aria-hidden
                data-demo={demoIndex >= 0 ? `qr-color-${i}` : undefined}
                className={cn(
                  "block size-5 rounded-full ring-offset-2 transition-[box-shadow,scale] duration-200 hover:scale-110 sm:size-[18px] md:size-5",
                  "peer-focus-visible:ring-[3px] peer-focus-visible:ring-[oklch(0.86_0.17_88/0.6)]",
                  on && "ring-2 ring-[#141312]",
                  (option.value === "#ffffff" || clear) && "border border-zinc-300",
                )}
                style={clear ? CHECKER : { backgroundColor: option.value }}
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

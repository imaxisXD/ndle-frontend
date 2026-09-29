"use client";

import { useLayoutEffect, useRef, type ComponentType, type ReactNode } from "react";
import {
  CalendarBlankIcon,
  CaretDownIcon,
  CircleNotchIcon,
  ClockIcon,
  CopyIcon,
  DownloadSimpleIcon,
  LightningIcon,
  LinkIcon,
  ArrowSquareOutIcon,
  PlusIcon,
  QrCodeIcon,
  ShareNetworkIcon,
  ShieldCheckIcon,
  SirenIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Bookmark, GraphUp, List, Settings, ShieldCheck } from "iconoir-react";
import { Badge } from "@ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card";
import { AnimatedMetricNumber } from "@/components/animated-metric-number";
import { ClicksChart } from "@/components/charts/clicks-chart";
import { CountryChart } from "@/components/charts/country-chart";
import { LiveClickHero } from "@/components/charts/live-click-hero";
import { UrlFavicon } from "@/components/url-favicon";
import { LinkWithFavicon } from "@/components/ui/link-with-favicon";
import LinkWithIcon from "@/components/ui/link-with-icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, getResponseTimeColor, getUptimeColor } from "@/lib/utils";
import { ASK, AskCard } from "./ask-card";
import { LinkAlertToasts, ShortLink, Toast, ToastStack } from "./toast";
import { useDemo } from "./demo-clock";
import {
  CURSOR,
  LONG_URL,
  NEW_LINK,
  T,
  TYPE,
  between,
  checkedAgo,
  linkCountAt,
  liveCountAt,
  stepAt,
  typedAt,
} from "./demo-script";
import { COUNTRY_CLICKS, SHORT_DOMAIN, WEEKLY_CLICKS } from "./sample-data";

/* The dashboard pages the hero demo walks through, built from the
   dashboard's own pieces (cards, badges, tables, charts, favicons) and laid
   out at desktop size. Nothing here keeps its own timers: every state is
   read from the demo clock, which is what lets the pass replay and seek.
   Classes here are unprefixed on purpose; the pane is scaled, not reflowed,
   so viewport breakpoints would pick the wrong layout. */

export const FIELD_FOCUS = "border-[oklch(0.78_0.15_88)] ring-[3px] ring-[oklch(0.86_0.17_88/0.35)]";

export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <header>
      <h2 className="font-doto roundness-100 text-4xl font-black">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm">{sub}</p>
    </header>
  );
}

function Caret() {
  return <span className="h2-caret ml-px h-4 w-px shrink-0 bg-[var(--fg)]" />;
}

/* ───────── 1 · Dashboard: shorten a link ───────── */

const RECENT = [
  { slug: "docs", destination: "https://notion.so/acme/docs", clicks: 312, created: "2 days ago" },
  { slug: "repo", destination: "https://github.com/acme/app", clicks: 1204, created: "5 days ago" },
  { slug: "deck", destination: "https://figma.com/deck/acme", clicks: 86, created: "1 week ago" },
];

export const RECENT_COLS = "grid grid-cols-[120px_minmax(0,1fr)_120px_130px] items-center gap-4 px-5";

export function HomePage() {
  const typed = useDemo((t) => typedAt(LONG_URL, T.typeUrl, TYPE.url, t));
  const focused = useDemo((t) => between(t, T.fieldClick, T.linkReady));
  const pressed = useDemo((t) => between(t, T.shortenClick, T.shortenClick + CURSOR.pressMs));
  const busy = useDemo((t) => between(t, T.shortenClick, T.linkReady));
  const ready = useDemo((t) => t >= T.linkReady);
  // The form resets once the link is made, as it does in the app.
  const value = ready ? "" : typed;

  return (
    <div className="h2-page space-y-6 px-8 py-7">
      <PageHeader title="ndle" sub="Short. Sharp. Smarter." />

      <Card>
        <CardHeader className="flex w-full flex-col items-start justify-between gap-1">
          <CardTitle className="text-lg font-medium">Shorten a Link</CardTitle>
          <CardDescription className="text-muted-foreground">Paste a long URL to create a short, trackable link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">Enter your long link</p>
          <div className="flex gap-2">
            <div
              data-demo="url-field"
              className={cn(
                "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-white px-3 text-sm transition-[border-color,box-shadow] duration-150",
                focused ? FIELD_FOCUS : "border-border",
              )}
            >
              {value.includes("acme.com") && (
                <span className="h2-settle -ml-1 shrink-0">
                  <UrlFavicon url={NEW_LINK.destination} size="sm" />
                </span>
              )}
              <span className="flex min-w-0 items-center">
                {value && <span className="truncate">{value}</span>}
                {focused && !busy && <Caret />}
                {!value && <span className="text-muted-foreground">Paste your long URL here…</span>}
              </span>
            </div>
            <span className="border-border flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-white px-3 text-xs shadow-xs">
              {SHORT_DOMAIN}
              <CaretDownIcon size={12} className="text-muted-foreground" />
            </span>
            <span
              data-demo="shorten"
              className={cn(
                "bg-accent inline-flex h-9 w-36 shrink-0 items-center justify-center gap-1.5 rounded-sm text-sm font-medium text-black transition-[opacity,scale] duration-150 ease-out",
                !value && !busy && "opacity-60",
                pressed && "scale-[0.96]",
              )}
            >
              {busy ? (
                <>
                  <CircleNotchIcon size={15} className="animate-spin" />
                  Shortening…
                </>
              ) : (
                <>
                  Shorten
                  <kbd className="rounded-xs bg-black/55 px-1 font-mono text-[10px] leading-4 text-white">⌘</kbd>
                  <kbd className="-ml-1 rounded-xs bg-black/55 px-1 font-mono text-[10px] leading-4 text-white">↵</kbd>
                </>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex w-full flex-col items-start justify-between gap-1">
          <CardTitle className="text-lg font-medium">Recent Links</CardTitle>
          <CardDescription className="text-muted-foreground">Your latest shortened links</CardDescription>
        </CardHeader>
        <div className={cn(RECENT_COLS, "border-border border-b py-3 text-sm font-medium")}>
          <span>Status</span>
          <span>Short Link</span>
          <span>Clicks</span>
          <span>Created</span>
        </div>
        {ready && (
          <div className="h2-row-open">
            <div>
              <NewLinkRow />
            </div>
          </div>
        )}
        {RECENT.map((row) => (
          <LinkRow key={row.slug} status="healthy" {...row} />
        ))}
      </Card>
    </div>
  );
}

function NewLinkRow() {
  const checked = useDemo((t) => t >= T.firstCheck);
  const clicks = useDemo((t) => stepAt(NEW_LINK.clicks, T.clicksStart, NEW_LINK.clickEvery, t));
  return (
    <LinkRow
      fresh
      status={checked ? "healthy" : "pending"}
      slug={NEW_LINK.slug}
      destination={LONG_URL}
      clicks={clicks}
      created="just now"
    />
  );
}

export function LinkRow({
  slug,
  destination,
  status,
  clicks,
  created,
  fresh = false,
}: {
  slug: string;
  destination: string;
  status: "healthy" | "pending";
  clicks: number;
  created: string;
  /** Just made: tinted while it settles in. */
  fresh?: boolean;
}) {
  return (
    <div className={cn(RECENT_COLS, "border-border border-b py-3", fresh && "h2-fresh")}>
      <span>
        <Badge key={status} variant={status === "healthy" ? "green" : "default"} className={cn(fresh && "h2-settle")}>
          {status}
        </Badge>
      </span>
      <div className="flex min-w-0 flex-col space-y-1">
        <LinkWithFavicon url={`https://${SHORT_DOMAIN}/${slug}`} originalUrl={destination} tabIndex={-1} />
        <p className="text-muted-foreground truncate text-xs">{destination}</p>
      </div>
      <div>
        <p className="text-sm tabular-nums">
          <AnimatedMetricNumber animationKey={`home2-demo:clicks:${slug}`} minWidthCh={0} value={clicks} />
        </p>
        <p className="text-muted-foreground text-[10px]">[clicks]</p>
      </div>
      <span className="text-muted-foreground text-xs">{created}</span>
    </div>
  );
}

/* ───────── 2 + 3 · Analytics, then the chart builder below it ───────── */

export function AnalyticsPage() {
  const scrolled = useDemo((t) => t >= T.scroll);
  const asked = useDemo((t) => t >= T.sendClick);
  const answered = useDemo((t) => t >= T.answer);
  const pageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // The page scrolls inside the pane to its bottom, where the chart builder
  // is, and follows the thread down as the question and answer land, the way
  // a chat keeps its newest message in view. Set on the element, not in
  // state, so the offset comes from the laid-out page rather than a guess.
  useLayoutEffect(() => {
    const page = pageRef.current;
    const content = contentRef.current;
    if (!page || !content) return;
    const bottom = Math.max(0, content.offsetHeight - page.clientHeight);
    content.style.transform = scrolled ? `translateY(${-bottom}px)` : "";
  }, [scrolled, asked, answered]);

  return (
    <div ref={pageRef} className="h2-page h-full">
      <div
        ref={contentRef}
        className="space-y-6 px-8 py-7 transition-transform duration-1000 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none"
      >
        <PageHeader title="Analytics" sub="Detailed insights and statistics" />

        <div className="bg-card border-border flex items-center justify-between rounded-md border px-3.5 py-3 shadow-xs">
          <span className="bg-muted inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium">
            <PlusIcon size={12} weight="bold" />
            Add Filter
          </span>
          <span className="border-border inline-flex h-8 items-center gap-2 rounded-md border bg-white px-3 text-xs">
            <CalendarBlankIcon size={14} className="text-muted-foreground" />
            Last 7 days
            <CaretDownIcon size={12} className="text-muted-foreground" />
          </span>
        </div>

        <LiveCounter />

        <div data-demo="charts" className="grid grid-cols-2 gap-6">
          <ClicksChart data={WEEKLY_CLICKS} />
          <CountryChart data={COUNTRY_CLICKS} />
        </div>

        <AskStep />
      </div>
    </div>
  );
}

function LiveCounter() {
  const count = useDemo(liveCountAt);
  return <LiveClickHero counterValue={count} />;
}

function AskStep() {
  const draft = useDemo((t) => (t < T.sendClick ? typedAt(ASK.question, T.typeQuestion, TYPE.question, t) : ""));
  const focused = useDemo((t) => between(t, T.askClick, T.sendClick));
  const asked = useDemo((t) => t >= T.sendClick);
  const answered = useDemo((t) => t >= T.answer);
  return <AskCard draft={draft} focused={focused} asked={asked} answered={answered} />;
}

/* ───────── 4 · Monitoring: the new link breaks, and comes back ───────── */

type LaunchState = "calm" | "checking" | "down" | "back";

function launchStateAt(t: number): LaunchState {
  if (t >= T.recovered) return "back";
  if (t >= T.down) return "down";
  if (t >= T.check) return "checking";
  return "calm";
}

/** "Checked" for the /launch row, counted from its latest check. */
function launchCheckedAt(t: number) {
  const since = t >= T.recovered ? T.recovered : t >= T.down ? T.down : null;
  if (since === null) return checkedAgo(12, t);
  const seconds = Math.floor((t - since) / 1000);
  return seconds < 2 ? "just now" : `${seconds}s ago`;
}

type MonitoredRow = {
  id: string;
  slug: string;
  destination: string;
  uptime: number;
  latency: number;
  incidents: number;
  /** Seconds since its last check when the page opens. */
  checkedOffset: number;
};

const MONITORED: MonitoredRow[] = [
  { id: "launch", slug: NEW_LINK.slug, destination: NEW_LINK.destination, uptime: 100, latency: 142, incidents: 0, checkedOffset: 12 },
  { id: "docs", slug: "docs", destination: "https://notion.so/acme/docs", uptime: 100, latency: 88, incidents: 0, checkedOffset: 31 },
  { id: "repo", slug: "repo", destination: "https://github.com/acme/app", uptime: 99.9, latency: 64, incidents: 0, checkedOffset: 44 },
  { id: "deck", slug: "deck", destination: "https://figma.com/deck/acme", uptime: 100, latency: 120, incidents: 1, checkedOffset: 52 },
  { id: "demo", slug: "demo", destination: "https://youtube.com/watch?v=acme", uptime: 99.7, latency: 210, incidents: 0, checkedOffset: 58 },
];

const COLUMNS = ["Status", "Link", "Uptime", "Latency", "Incidents", "Checked"];

export function MonitoringPage() {
  const down = useDemo((t) => launchStateAt(t) === "down");

  return (
    <div className="h2-page space-y-7 px-8 py-7">
      <PageHeader title="Link Monitoring" sub="Real-time health monitoring and uptime tracking" />

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Healthy Links" value={down ? 4 : 5} color="text-green-600" />
        <Stat label="Warnings" value={0} color="text-amber-500" />
        <Stat label="Errors" value={down ? 1 : 0} color="text-red-500" />
        <Stat label="Avg Uptime" value={99.8} color="text-blue-500" format={(v) => `${v.toFixed(1)}%`} />
      </div>

      <div className="border-border bg-card overflow-hidden rounded-md border">
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader className="bg-card">
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((h, i) => (
                <TableHead key={h} className="px-5 py-3" style={{ width: i === 1 ? 330 : 118 }}>
                  <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{h}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {MONITORED.map((row) => (row.id === "launch" ? <LaunchRow key={row.id} row={row} /> : <QuietRow key={row.id} row={row} />))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function QuietRow({ row }: { row: MonitoredRow }) {
  const checked = useDemo((t) => checkedAgo(row.checkedOffset, t));
  return (
    <TableRow className="bg-card">
      <TableCell className="px-5 py-4">
        <Badge variant="green" className="capitalize">
          healthy
        </Badge>
      </TableCell>
      <LinkCell row={row} />
      <Metric label="Uptime" value={row.uptime} id={`${row.id}:uptime`} format={(v) => `${v}%`} />
      <Metric
        label="Latency"
        value={row.latency}
        id={`${row.id}:latency`}
        format={(v) => `${v}ms`}
        className={getResponseTimeColor(row.latency)}
      />
      <Metric label="Incidents" value={row.incidents} id={`${row.id}:incidents`} />
      <Checked>{checked}</Checked>
    </TableRow>
  );
}

/** The link made in chapter 1: checked, broken, recovered. */
function LaunchRow({ row }: { row: MonitoredRow }) {
  const state = useDemo(launchStateAt);
  const checked = useDemo(launchCheckedAt);
  const broken = state === "down";
  const hadIncident = state === "down" || state === "back";
  const latency = state === "back" ? 164 : row.latency;

  return (
    <TableRow data-demo="launch-row" className={cn("bg-card transition-colors duration-500", broken && "bg-red-50/70")}>
      <TableCell className="px-5 py-4">
        <Badge key={broken ? "error" : "healthy"} variant={broken ? "red" : "green"} className={cn("capitalize", hadIncident && "h2-settle")}>
          {broken ? "error" : "healthy"}
        </Badge>
      </TableCell>
      <LinkCell row={row} />
      <Metric label="Uptime" value={hadIncident ? 99.2 : row.uptime} id={`${row.id}:uptime`} format={(v) => `${v}%`} />
      {broken ? (
        <TableCell className="px-5 py-4">
          <p className="text-muted-foreground text-[10px] tracking-wider uppercase">Latency</p>
          <p className="mt-1 text-xs text-red-600">404</p>
        </TableCell>
      ) : (
        <Metric
          label="Latency"
          value={latency}
          id={`${row.id}:latency`}
          format={(v) => `${v}ms`}
          className={getResponseTimeColor(latency)}
        />
      )}
      <Metric label="Incidents" value={row.incidents + (hadIncident ? 1 : 0)} id={`${row.id}:incidents`} />
      <Checked>
        {state === "checking" ? (
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <CircleNotchIcon size={12} className="animate-spin" />
            checking…
          </span>
        ) : (
          checked
        )}
      </Checked>
    </TableRow>
  );
}

function LinkCell({ row }: { row: MonitoredRow }) {
  return (
    <TableCell className="px-5 py-4">
      <div className="flex min-w-0 flex-col space-y-1">
        <span data-demo={`${row.id}-link`} className="w-fit">
          <LinkWithFavicon url={`https://${SHORT_DOMAIN}/${row.slug}`} originalUrl={row.destination} tabIndex={-1} />
        </span>
        <p className="text-muted-foreground max-w-[260px] truncate text-xs">{row.destination}</p>
      </div>
    </TableCell>
  );
}

function Checked({ children }: { children: ReactNode }) {
  return (
    <TableCell className="px-5 py-4">
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">Checked</p>
      <p className="mt-1 text-xs">{children}</p>
    </TableCell>
  );
}

function Stat({
  label,
  value,
  color,
  format,
}: {
  label: string;
  value: number;
  color: string;
  format?: (value: number) => string;
}) {
  return (
    <Card className="rounded-sm bg-white">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">{label}</p>
          <p className={cn("text-xl tabular-nums", color)}>
            [
            <AnimatedMetricNumber animationKey={`home2-stat:${label}`} formatValue={format} minWidthCh={0} value={value} />]
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  id,
  format,
  className,
}: {
  label: string;
  value: number;
  id: string;
  format?: (value: number) => string;
  className?: string;
}) {
  return (
    <TableCell className="px-5 py-4">
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">{label}</p>
      <p className={cn("mt-1 font-mono text-xs tabular-nums", className)}>
        <AnimatedMetricNumber animationKey={`home2-row:${id}`} formatValue={format} minWidthCh={4} value={value} />
      </p>
    </TableCell>
  );
}

/* ───────── The end: the link's own page ───────── */

/* Where the pass rests, so the last frame is the one a customer keeps open:
   the link they made, its clicks still coming in, its health, and the
   incident it just came through, all on one page. Opened on its Health tab,
   straight from the Monitoring row. */

export const LINK_ACTIONS = [
  { label: "Copy", Icon: CopyIcon },
  { label: "Share", Icon: ShareNetworkIcon },
  { label: "QR", Icon: QrCodeIcon, iconOnly: true },
  { label: "Open", Icon: ArrowSquareOutIcon },
];

export const LINK_TABS = [
  { label: "Analytics", Icon: GraphUp },
  { label: "Activity", Icon: List },
  { label: "Notes", Icon: Bookmark },
  { label: "Health", Icon: ShieldCheck, on: true },
  { label: "Settings", Icon: Settings },
];

/* Newest first, as the Health tab lists them; `ago` is minutes before the
   page opens. */
const INCIDENTS = [
  { type: "Resolved", variant: "green", message: "Back online on the next check. 200 OK in 164ms.", ago: "1m" },
  { type: "Error", variant: "red", message: "404 Not Found. Alert emailed.", ago: "5m" },
] as const;

const LINK_UPTIME = 99.2;
const LINK_LATENCY = 164;

export function LinkPage() {
  const checked = useDemo((t) => {
    const seconds = Math.floor(Math.max(0, t - T.linkClick) / 1000) + 3;
    return `${seconds}s ago`;
  });

  return (
    <div className="h2-page space-y-5 px-8 py-7">
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <LinkWithIcon
            link={`${SHORT_DOMAIN}/${NEW_LINK.slug}`}
            href={`https://${SHORT_DOMAIN}/${NEW_LINK.slug}`}
            tabIndex={-1}
            className="max-w-full justify-start text-3xl"
            iconClassName="size-4"
          />
          <div className="text-muted-foreground flex w-full min-w-0 items-center gap-2 text-sm">
            <LinkIcon className="size-3.5 shrink-0" />
            <span className="min-w-0 max-w-md truncate">{LONG_URL}</span>
          </div>
          <p className="text-muted-foreground/70 text-xs">[Created 6 minutes ago]</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="green">Active</Badge>
          {LINK_ACTIONS.map(({ label, Icon, iconOnly }) => (
            <span
              key={label}
              className="border-border flex h-8 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs shadow-xs"
            >
              {iconOnly ? (
                <>
                  <DownloadSimpleIcon size={12} />
                  <Icon size={13} />
                </>
              ) : (
                <>
                  <Icon size={13} />
                  {label}
                </>
              )}
            </span>
          ))}
        </div>
      </header>

      <div data-demo="link-clicks">
        <LinkClicks />
      </div>

      <div className="border-border flex gap-8 border-b">
        {LINK_TABS.map(({ label, Icon, on }) => (
          <span
            key={label}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 pb-2.5 text-sm",
              on ? "border-[var(--fg)] font-medium text-[var(--fg)]" : "text-muted-foreground border-transparent",
            )}
          >
            <Icon className="size-4" />
            {label}
          </span>
        ))}
      </div>

      <Card variant="accent" className="border-border border px-2 py-2">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <ShieldCheckIcon className="size-5 text-green-600" weight="duotone" />
            Link Health Status
          </CardTitle>
          <CardDescription className="mt-0.5">Healthy again. Every check is passing.</CardDescription>
        </CardHeader>
        <CardContent className="rounded-sm [&:last-child]:rounded-b-sm">
          <div className="grid grid-cols-3 gap-4">
            <HealthTile Icon={ShieldCheckIcon} label="Uptime" note="Since it was created">
              <span className={getUptimeColor(LINK_UPTIME)}>[{LINK_UPTIME}%]</span>
            </HealthTile>
            <HealthTile Icon={LightningIcon} label="Response Time" note="Latest check">
              <span className={getResponseTimeColor(LINK_LATENCY)}>[{LINK_LATENCY}ms]</span>
            </HealthTile>
            <HealthTile Icon={ClockIcon} label="Last Checked" note="1 incident">
              [{checked}]
            </HealthTile>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <SirenIcon className="size-4 fill-red-500" weight="duotone" />
            Incident History
          </CardTitle>
          <CardDescription>Latest alerts and resolved issues</CardDescription>
        </CardHeader>
        <div className="divide-border divide-y">
          {INCIDENTS.map((incident) => (
            <div key={incident.type} className="flex items-center gap-3 px-5 py-3">
              <span className="w-24 shrink-0">
                <Badge variant={incident.variant} className="text-xs">
                  {incident.type}
                </Badge>
              </span>
              <p className="min-w-0 flex-1 truncate text-sm">{incident.message}</p>
              <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">[{incident.ago}]</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LinkClicks() {
  const count = useDemo(linkCountAt);
  return <LiveClickHero counterValue={count} />;
}

export function HealthTile({
  Icon,
  label,
  note,
  children,
}: {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-muted/30 border-border rounded-sm border p-3">
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-4" />
        <span className="text-muted-foreground text-xs">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-medium">{children}</p>
      <p className="text-muted-foreground mt-1 text-xs">{note}</p>
    </div>
  );
}

/* ───────── Toasts over the page (toast.tsx) ───────── */

/** The app's success toast while the new link settles in, over the older
    rows, clear of the new one and its clicks. */
export function HomeToast() {
  const shown = useDemo((t) => between(t, T.linkReady, T.linkReady + 2800));
  return (
    <ToastStack>
      <Toast shown={shown} tone="ready" title="Short link ready">
        Copy and share: <ShortLink />
      </Toast>
    </ToastStack>
  );
}

/* The two alerts stay up on Monitoring and clear when the link's page opens. */
export function AlertToasts() {
  const down = useDemo((t) => between(t, T.alert, T.linkClick));
  const up = useDemo((t) => between(t, T.recovered, T.linkClick));
  return <LinkAlertToasts down={down} up={up} />;
}

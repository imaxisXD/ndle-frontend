import type { ComponentType, ReactNode } from "react";
import { BrowserIcon, LinkSimpleIcon, MegaphoneIcon, QrCodeIcon, SignpostIcon } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ui/badge";
import { cn } from "@/lib/utils";

/* Diagrams for blog posts, drawn in code in the landing page's features-bento
   language: the dashboard's dot-grid canvas inside a 2px ink outline, pieces
   edged in ink with a hard ink shadow, dashed wires between them, and Signal
   Yellow on the part to look at. They render on the server, so they stay sharp
   and crawlable and need no image files. */

type Icon = ComponentType<{ size?: number; className?: string; weight?: "regular" | "bold" }>;

/** The bento's product window: a 2px ink edge and a hard ink shadow. */
const WINDOW = "overflow-hidden rounded-[12px] border-2 border-[#141312] bg-white shadow-[3px_4px_0_0_#141312]";

export function Figure({ caption, children }: { caption?: string; children: ReactNode }) {
  return (
    <figure className="my-10">
      <div className="dot-page overflow-hidden border-2 border-[#141312] p-5 sm:p-7">{children}</div>
      {caption && <figcaption className="mt-3 text-center font-mono text-xs text-[#3d3d3d]">{caption}</figcaption>}
    </figure>
  );
}

/** `lit` marks the part to look at; `detour` a stop your visitor didn't ask for. */
function Node({
  icon: Icon,
  children,
  lit = false,
  detour = false,
}: {
  icon: Icon;
  children: ReactNode;
  lit?: boolean;
  detour?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border-[1.5px] px-3 py-2.5 font-mono text-[13px]",
        detour
          ? "border-dashed border-red-500 bg-red-50 text-red-700"
          : "border-[#141312] text-[#141312] shadow-[2px_2px_0_0_#141312]",
        !detour && (lit ? "bg-[var(--sig)]" : "bg-white"),
      )}
    >
      <Icon size={15} weight="bold" className="shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  );
}

/** The dashed wire between two nodes: down on phones, across from `sm` up. */
function Wire({ lit = false, className }: { lit?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mx-auto block h-6 w-0 shrink-0 border-dashed sm:mx-0 sm:h-0 sm:w-8",
        lit ? "border-l-2 border-[#141312] sm:border-t-2 sm:border-l-0" : "border-l border-[#141312]/40 sm:border-t sm:border-l-0",
        className,
      )}
    />
  );
}

function Stage({
  icon,
  label,
  value,
  breaks,
  lit = false,
}: {
  icon: Icon;
  label: string;
  value: string;
  breaks: string[];
  lit?: boolean;
}) {
  return (
    <div className="min-w-0 sm:flex-1">
      <p className="mb-2 flex h-5 items-center gap-2 font-mono text-xs whitespace-nowrap text-[#3d3d3d]">
        {label}
        {lit && (
          <span className="rounded-[4px] border border-[#141312] bg-white px-1.5 text-[11px] leading-[18px] whitespace-nowrap text-[#141312]">
            check first
          </span>
        )}
      </p>
      <Node icon={icon} lit={lit}>
        {value}
      </Node>
      <ul className="mt-3 space-y-1 font-mono text-[12.5px] leading-5 text-[#3d3d3d]">
        {breaks.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-red-500" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A printed QR code, the short link inside it, and the page it opens, with
    what breaks at each hop. Also the post's cover on the blog index. */
export function QrPath() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start">
      <Stage icon={QrCodeIcon} label="Printed code" value="Table 4 menu" breaks={["Too small or low contrast", "Glare, creases, damage"]} />
      <Wire className="sm:mt-[46px]" />
      <Stage
        icon={LinkSimpleIcon}
        label="Short link inside it"
        value="qr.example/x7Kp"
        breaks={["Trial or plan ended", "Scan cap reached", "Ad page added"]}
      />
      <Wire lit className="sm:mt-[46px]" />
      <Stage
        icon={BrowserIcon}
        label="Your page"
        value="yourcafe.com/menu"
        breaks={["Moved or deleted (404)", "Domain or SSL expired", "Server down"]}
        lit
      />
    </div>
  );
}

type Hop = { icon: Icon; value: string; detour?: boolean; lit?: boolean };

/** A Bitly link, Bitly's redirect, and the page it opens, with what breaks
    at each hop. Also the post's cover on the blog index. */
export function BitlyPath() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start">
      <Stage
        icon={LinkSimpleIcon}
        label="The link"
        value="bit.ly/Spring-Menu"
        breaks={["Typo or wrong capitals", "Deleted or expired", "Never existed"]}
      />
      <Wire className="sm:mt-[46px]" />
      <Stage
        icon={SignpostIcon}
        label="Bitly's redirect"
        value="Bitly"
        breaks={["Warning or blocked page", "Ad page on free plans", "Blocked by a network"]}
      />
      <Wire lit className="sm:mt-[46px]" />
      <Stage
        icon={BrowserIcon}
        label="Your page"
        value="yourcafe.com/menu"
        breaks={["Moved or deleted (404)", "Certificate expired", "Server down"]}
        lit
      />
    </div>
  );
}

function Chain({ hops }: { hops: Hop[] }) {
  return (
    <div className="flex min-w-0 flex-col sm:flex-row sm:items-center">
      {hops.map((hop, i) => (
        <div key={hop.value} className="contents">
          {i > 0 && <Wire />}
          <div className="min-w-0 sm:max-w-[220px]">
            <Node icon={hop.icon} detour={hop.detour} lit={hop.lit}>
              {hop.value}
            </Node>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Two short links on their way to the same page: one stops at an ad page
    first, one goes straight there. Rows of a label, a chain and a note. */
function Routes({ rows }: { rows: Array<{ label: string; hops: Hop[]; note: string }> }) {
  return (
    <div className="space-y-6">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start">
          <p className="pt-2.5 font-[family-name:var(--font-bebas)] text-2xl leading-none tracking-[0.01em] text-[#141312] uppercase">
            {row.label}
          </p>
          <div className="min-w-0 space-y-2.5">
            <Chain hops={row.hops} />
            <p className="font-mono text-[12.5px] leading-5 text-[#3d3d3d]">{row.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/** What a visitor goes through on a free Bitly link, and on an ndle link. */
export function AdDetour() {
  return (
    <Routes
      rows={[
        {
          label: "Bitly free",
          hops: [
            { icon: LinkSimpleIcon, value: "bit.ly/menu" },
            { icon: MegaphoneIcon, value: "Ad page", detour: true },
            { icon: BrowserIcon, value: "yourcafe.com" },
          ],
          note: "Every visitor gets the preview page with an ad before your page.",
        },
        {
          label: "ndle",
          hops: [
            { icon: LinkSimpleIcon, value: "ndle.fyi/k3x9qa" },
            { icon: BrowserIcon, value: "yourcafe.com", lit: true },
          ],
          note: "The click goes straight to your page, on the free plan too.",
        },
      ]}
    />
  );
}

/** What a static and a dynamic QR code hold. */
export function StaticVsDynamic() {
  return (
    <Routes
      rows={[
        {
          label: "Static",
          hops: [
            { icon: QrCodeIcon, value: "QR code" },
            { icon: BrowserIcon, value: "yourcafe.com/menu" },
          ],
          note: "The page's address is in the code itself. Nothing in between can expire, and nothing can be changed.",
        },
        {
          label: "Dynamic",
          hops: [
            { icon: QrCodeIcon, value: "QR code" },
            { icon: LinkSimpleIcon, value: "qr.example/x7Kp" },
            { icon: BrowserIcon, value: "yourcafe.com/menu" },
          ],
          note: "The code holds a short link that redirects. It works only while that short link does.",
        },
      ]}
    />
  );
}

/** One link, three ways it rots: fine on day one, then the page goes, or the
    shortener in front of it does. */
export function RotRoutes() {
  return (
    <Routes
      rows={[
        {
          label: "Day one",
          hops: [
            { icon: LinkSimpleIcon, value: "short link" },
            { icon: BrowserIcon, value: "yoursite.com/guide", lit: true },
          ],
          note: "The link and the page both work.",
        },
        {
          label: "Page moved",
          hops: [
            { icon: LinkSimpleIcon, value: "short link" },
            { icon: BrowserIcon, value: "404 Not Found", detour: true },
          ],
          note: "The link still redirects, to a page that's gone.",
        },
        {
          label: "Shortener closed",
          hops: [
            { icon: LinkSimpleIcon, value: "short link", detour: true },
            { icon: BrowserIcon, value: "yoursite.com/guide" },
          ],
          note: "The page is fine, but nothing sends visitors to it.",
        },
      ]}
    />
  );
}

const CODES = [
  { code: "200", tone: "ok", meaning: "OK. The page loaded." },
  { code: "301 / 308", tone: "move", meaning: "Moved for good. Fine if it lands on the right page." },
  { code: "302 / 307", tone: "move", meaning: "Moved for now. Short links often use these." },
  { code: "404 / 410", tone: "bad", meaning: "Not found, or gone on purpose. The page is missing." },
  { code: "5xx", tone: "bad", meaning: "The server failed. Often temporary, sometimes not." },
] as const;

/** The status codes worth knowing, as ink chips with what each one means. */
export function StatusCodes() {
  return (
    <dl className="grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-center">
      {CODES.map(({ code, tone, meaning }) => (
        <div key={code} className="contents">
          <dt>
            <span
              className={cn(
                "inline-flex rounded-md border-[1.5px] px-2.5 py-1 font-mono text-[13px]",
                tone === "ok" && "border-[#141312] bg-[var(--sig)] text-[#141312]",
                tone === "move" && "border-[#141312] bg-white text-[#141312]",
                tone === "bad" && "border-dashed border-red-500 bg-red-50 text-red-700",
              )}
            >
              {code}
            </span>
          </dt>
          <dd className="font-mono text-[12.5px] leading-5 text-[#3d3d3d]">{meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A guest link and an account link, side by side. */
export function GuestVsAccount() {
  return (
    <Routes
      rows={[
        {
          label: "Guest",
          hops: [
            { icon: LinkSimpleIcon, value: "ndle.fyi/p4w8ze" },
            { icon: BrowserIcon, value: "yoursite.com/page" },
          ],
          note: "No sign-up. Lasts 7 days, with no stats and no checks.",
        },
        {
          label: "Account",
          hops: [
            { icon: LinkSimpleIcon, value: "ndle.fyi/k3x9qa" },
            { icon: BrowserIcon, value: "yoursite.com/page", lit: true },
          ],
          note: "Free. Doesn't expire, counts clicks, and is checked every 30 minutes.",
        },
      ]}
    />
  );
}

const UTM_PARTS = [
  { text: "yoursite.com/sale", label: "the page" },
  { text: "?utm_source=newsletter", label: "where from" },
  { text: "&utm_medium=email", label: "what kind of channel" },
  { text: "&utm_campaign=spring_sale", label: "which campaign" },
];

/** A campaign link taken apart: the page, then each tag with what it says. */
export function UtmAnatomy() {
  return (
    <ol className="flex flex-wrap gap-x-1.5 gap-y-4">
      {UTM_PARTS.map((part, i) => (
        <li key={part.text} className="min-w-0">
          <span
            className={cn(
              "block rounded-md border-[1.5px] border-[#141312] px-2.5 py-1.5 font-mono text-[13px] [overflow-wrap:anywhere] text-[#141312] shadow-[2px_2px_0_0_#141312]",
              i === 0 ? "bg-white" : "bg-[var(--sig)]",
            )}
          >
            {part.text}
          </span>
          <span className="mt-1.5 block font-mono text-[11.5px] text-[#3d3d3d]">{part.label}</span>
        </li>
      ))}
    </ol>
  );
}

const GOOGL = [
  { date: "30 Mar 2018", text: "Google starts winding goo.gl down and says existing links will keep redirecting." },
  { date: "18 Jul 2024", text: "Google announces every goo.gl link will stop working after 25 August 2025." },
  { date: "23 Aug 2024", text: "Warning pages start appearing on some links." },
  { date: "1 Aug 2025", text: "Google changes course and keeps actively used links alive." },
  { date: "25 Aug 2025", text: "Links with no activity in late 2024 stop working.", end: true },
];

/** The end of goo.gl, as a timeline on a dashed wire; the last stop is red. */
export function GooglTimeline() {
  return (
    <ol className="relative space-y-4 pl-7 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:border-l before:border-dashed before:border-[#141312]/40">
      {GOOGL.map((event) => (
        <li key={event.date} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute top-[5px] -left-7 size-[15px] rounded-full border-[1.5px] border-[#141312]",
              event.end ? "bg-red-500" : "bg-white",
            )}
          />
          <p className="font-mono text-xs text-[#3d3d3d]">{event.date}</p>
          <p className={cn("mt-0.5 font-mono text-[13px] leading-5", event.end ? "text-red-700" : "text-[#141312]")}>{event.text}</p>
        </li>
      ))}
    </ol>
  );
}

/** A failed check as it appears under Recent incidents on ndle's Monitoring
    page (components/recent-incidents.tsx), with the product's own wording and
    a slug in ndle's own format (six random characters, convex/utils.ts),
    framed the way the bento frames dashboard pieces. */
export function FailedCheck() {
  return (
    <div className={cn(WINDOW, "p-3")}>
      <div className="relative flex items-start gap-3 overflow-hidden rounded-lg border border-red-400/60 bg-white p-3 before:pointer-events-none before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,rgba(239,68,68,0.1)_10px,rgba(239,68,68,0.1)_20px)] before:[mask-image:linear-gradient(to_right,white,transparent_70%)] sm:gap-4 sm:p-4">
        <div className="relative min-w-0 flex-1">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-8">
            <div className="w-24 shrink-0">
              <Badge variant="red" label="Error" />
            </div>
            <div className="flex w-full min-w-0 flex-col gap-1">
              <code className="block truncate text-sm font-medium text-[#141312]">ndle.fyi/k3x9qa</code>
              <p className="text-sm text-[#3d3d3d] [overflow-wrap:anywhere]">
                The destination page could not be found. It may have been moved or deleted.
              </p>
            </div>
          </div>
        </div>
        <div className="relative hidden shrink-0 flex-col gap-1 text-right sm:flex">
          <p className="text-sm text-[#141312]">Occurred</p>
          <p className="text-xs text-[#3d3d3d]">12m ago</p>
        </div>
      </div>
    </div>
  );
}

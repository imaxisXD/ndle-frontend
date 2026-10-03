"use client";

import {
  CaretDownIcon,
  CircleNotchIcon,
  ClockIcon,
  LightningIcon,
  LinkIcon,
  ShieldCheckIcon,
  LockSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/card";
import { LiveClickHero } from "@/components/charts/live-click-hero";
import { LinkActionsBar } from "@/components/LinkActionsBar";
import LinkWithIcon from "@/components/ui/link-with-icon";
import { getQrLogo, getQrMarginSize, normalizeQrStyle } from "@/lib/qr";
import { qrCodeSvg } from "@/lib/qr-code";
import { downloadQrPng } from "@/lib/qr-file";
import { cn } from "@/lib/utils";
import { FIELD_FOCUS, HealthTile, LINK_TABS, LinkRow, PageHeader, RECENT_COLS } from "./demo-pages";
import { SHORT_DOMAIN } from "./sample-data";
import { Toast, ToastStack } from "./toast";

/* The two dashboard pages of the visitor's own pass (your-link-takeover.tsx),
   built like the hero demo's (demo-pages.tsx) from the dashboard's pieces,
   but with their link, and only what's true of it: a new account's
   dashboard with one link in it, no clicks yet, and no check yet. On its
   own page the live click counter stays in view but its number is locked:
   it keeps rolling, blurred past reading, under a "sign up to see it"
   chip, so it's plainly live and plainly not theirs to read yet. The rest
   is locked outright: it blurs out behind the sign-up card. Once the pass rests
   there, the link's header is the dashboard's own (LinkActionsBar): its
   short link, Copy, Share, QR and Open work as they do in the app. Every state comes in as a prop, read off the pass's
   timeline, so the pass can be scrubbed. Laid out at desktop size; the
   stage is scaled, not reflowed. */

export type YourLink = {
  /** The short link without its scheme, e.g. ndle.fyi/k3x9qa. */
  short: string;
  /** Where it goes, with its scheme. */
  destination: string;
  /** When the guest link expires (epoch ms). */
  expiresAt: number;
};

/** A new short link, as the server hands it back. */
export type MadeLink = { short: string; expiresAt: number };

export function slugOf(link: YourLink) {
  return link.short.slice(link.short.indexOf("/") + 1);
}

/* ───────── Their dashboard: the link pasted in, shortened, listed ───────── */

export function YourHomePage({
  link,
  value,
  focused,
  flash,
  busy,
  pressed,
  listed,
  open,
  fresh,
  toast,
}: {
  link: YourLink;
  /** What's in the Shorten field. */
  value: string;
  focused: boolean;
  /** The pasted text's selection highlight, 1 → 0. */
  flash: number;
  busy: boolean;
  /** The Shorten button's press, as a scale. */
  pressed: number;
  /** Their link is in Recent Links. */
  listed: boolean;
  /** How far its row has opened, 0 → 1. */
  open: number;
  /** Its just-made tint, 1 → 0. */
  fresh: number;
  toast: boolean;
}) {
  return (
    <div className="h2-page relative h-full space-y-6 px-8 py-7">
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
              data-pass="field"
              className={cn(
                "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md border bg-white px-3 text-sm transition-[border-color,box-shadow] duration-150",
                focused ? FIELD_FOCUS : "border-border",
              )}
            >
              {value ? (
                <span className="truncate rounded-[3px]" style={{ backgroundColor: `oklch(0.86 0.17 88 / ${0.4 * flash})` }}>
                  {value}
                </span>
              ) : (
                <span className="text-muted-foreground">Paste your long URL here…</span>
              )}
            </div>
            <span className="border-border flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-white px-3 text-xs shadow-xs">
              {SHORT_DOMAIN}
              <CaretDownIcon size={12} className="text-muted-foreground" />
            </span>
            <span
              data-pass="shorten"
              className="bg-accent inline-flex h-9 w-36 shrink-0 items-center justify-center gap-1.5 rounded-sm text-sm font-medium text-black"
              style={{ scale: pressed }}
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
        {listed ? (
          // Opens from nothing, as a new row does in the app
          <div className="grid" style={{ gridTemplateRows: `${open}fr`, opacity: Math.min(1, open * 1.5) }}>
            <div className="relative min-h-0 overflow-hidden" data-pass="row">
              <span
                aria-hidden
                className="absolute inset-0"
                style={{ backgroundColor: `oklch(0.86 0.17 88 / ${0.14 * fresh})` }}
              />
              <LinkRow status="pending" slug={slugOf(link)} destination={link.destination} clicks={0} created="just now" />
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground px-5 py-6 text-sm">No links yet. Shorten one above.</p>
        )}
      </Card>

      <ToastStack>
        <Toast shown={toast} tone="ready" title="Short link ready">
          Copy and share: <span className="font-mono text-white/90">{link.short}</span>
        </Toast>
      </ToastStack>
    </div>
  );
}

/* ───────── Its own page: no clicks yet, and waiting for its first check ───────── */

/* The QR code the QR button downloads, as a free account's code comes:
   the dashboard's default style, with ndle's mark in the middle. */
const QR_STYLE = normalizeQrStyle({ size: 512 });

export function YourLinkPage({
  link,
  locked,
  interactive,
}: {
  link: YourLink;
  /** The stats locking: how far they've blurred (px) and washed out (0–1). */
  locked: { blur: number; wash: number };
  /** The pass has come to rest here: the header's controls work. */
  interactive: boolean;
}) {
  const { short } = link;
  const downloadQr = () => {
    const svg = qrCodeSvg(`https://${short}`, {
      size: QR_STYLE.size,
      fg: QR_STYLE.fg,
      bg: QR_STYLE.bg,
      ecc: QR_STYLE.ecc,
      margin: getQrMarginSize(QR_STYLE),
      logo: getQrLogo(QR_STYLE),
    });
    void downloadQrPng(svg, QR_STYLE.size, `${short.slice(short.indexOf("/") + 1) || "ndle"}-qr.png`, 1);
  };

  return (
    <div className="h2-page space-y-5 px-8 py-7">
      <header className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <LinkWithIcon
            link={short}
            href={`https://${short}`}
            tabIndex={interactive ? undefined : -1}
            className="max-w-full justify-start text-3xl"
            iconClassName="size-4"
          />
          <div className="text-muted-foreground flex w-full min-w-0 items-center gap-2 text-sm">
            <LinkIcon className="size-3.5 shrink-0" />
            <span className="max-w-md min-w-0 truncate">{link.destination}</span>
          </div>
          <p className="text-muted-foreground/70 text-xs">[Created just now]</p>
        </div>
        <LinkActionsBar shortUrl={short} fullUrl={link.destination} qrEnabled onDownloadQR={downloadQr} />
      </header>

      <LockedCounter locked={locked.blur} />

      {/* Everything under the counter is what a free account unlocks */}
      <div className="relative space-y-5" style={{ filter: locked.blur > 0 ? `blur(${locked.blur}px)` : undefined }}>
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
              <ShieldCheckIcon className="text-muted-foreground size-5" weight="duotone" />
              Link Health Status
            </CardTitle>
            <CardDescription className="mt-0.5">Waiting for its first check. ndle checks it every 30 minutes.</CardDescription>
          </CardHeader>
          <CardContent className="rounded-sm [&:last-child]:rounded-b-sm">
            <div className="grid grid-cols-3 gap-4">
              <HealthTile Icon={ShieldCheckIcon} label="Uptime" note="No checks yet">
                <span className="text-muted-foreground">[—]</span>
              </HealthTile>
              <HealthTile Icon={LightningIcon} label="Response Time" note="No checks yet">
                <span className="text-muted-foreground">[—]</span>
              </HealthTile>
              <HealthTile Icon={ClockIcon} label="Last Checked" note="Every 30 minutes">
                [not yet]
              </HealthTile>
            </div>
          </CardContent>
        </Card>
        <div aria-hidden className="absolute -inset-4 bg-[#f6f6f6]" style={{ opacity: locked.wash }} />
      </div>
    </div>
  );
}

/* ───────── The counter, live but locked ───────── */

const TEASE = {
  every: 900, // ms between rolls of the hidden number
  min: 100, // the hidden number rolls through three-digit values:
  max: 999, // scrambled, never the link's real count, and never readable
  blurAt: 0.8, // times the page's lock blur, for the number: its digits still move, unreadably
};

/** The dashboard's Live Click Counter, with its number hidden: before the
    lock it reads 0, the link's real count; once locked, the number keeps
    rolling under a blur and a sign-up chip. `locked` is the page's lock
    blur in px (0 before the lock). */
function LockedCounter({ locked }: { locked: number }) {
  const reduce = useReducedMotion();
  const teasing = locked > 0.5;
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!teasing || reduce) return;
    const roll = () => setValue(TEASE.min + Math.floor(Math.random() * (TEASE.max - TEASE.min + 1)));
    roll();
    const id = window.setInterval(roll, TEASE.every);
    return () => window.clearInterval(id);
  }, [teasing, reduce]);

  const shown = Math.min(1, locked / 4);
  return (
    <div
      className="relative [&_.font-doto>:first-child]:[filter:blur(var(--count-blur))]"
      style={{ "--count-blur": `${locked * TEASE.blurAt}px` } as CSSProperties}
    >
      <LiveClickHero counterValue={teasing ? (reduce ? TEASE.max : value) : 0} />
      {/* Beside the black circle, so the blurred number still shows rolling: why it can't be read */}
      <span
        className="absolute top-1/2 right-[272px] flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-[var(--sig)] px-3 py-1.5 font-mono text-xs font-medium text-[#141312] shadow-[0_2px_10px_rgb(0_0_0/0.35)]"
        style={{ opacity: shown, scale: 0.9 + 0.1 * shown }}
      >
        <LockSimpleIcon size={12} weight="bold" />
        Sign up to see it live
      </span>
    </div>
  );
}

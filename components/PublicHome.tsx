"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ensureGuestSession, type GuestSession } from "@/lib/guest";
import { makeShortLink } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { NdleDotMatrix } from "@/components/ndle-dot-matrix";
import { DoodleGitHub, DoodleLinkedIn, DoodleX } from "@/components/doodle-icons";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  MinusIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";

/* ─────────────────────────────────────────────────────────
 * HERO STORYBOARD   (fires on mount)
 *
 *     0ms   stage 0 — offstage
 *   120ms   stage 1 — classification stamps fade in
 *   280ms   stage 2 — "AN NDLE PRODUCTION" arrives
 *   460ms   stage 3 — title line 1 drops in (yellow)
 *   680ms   stage 4 — title line 2 drops in (orange, larger)
 *   960ms   stage 5 — subtitle fades in
 *  1120ms   stage 6 — form band springs up
 * ───────────────────────────────────────────────────────── */

const HERO_TIMING = {
  stamps: 120,
  production: 280,
  line1: 460,
  line2: 680,
  subtitle: 960,
  form: 1120,
};

const HERO_LINE = {
  y: 14,
  scale: 0.96,
  spring: { type: "spring" as const, stiffness: 300, damping: 28 },
};
const HERO_FORM = {
  y: 16,
  scale: 0.96,
  spring: { type: "spring" as const, stiffness: 340, damping: 28 },
};
const HERO_STAMP = {
  y: -6,
  spring: { type: "spring" as const, stiffness: 380, damping: 26 },
};

const PILLARS = {
  header: {
    y: 14,
    delay: 0.12,
    spring: { type: "spring" as const, stiffness: 320, damping: 30 },
  },
  card: {
    y: 22,
    scale: 0.98,
    stagger: 0.14,
    baseDelay: 0.28,
    spring: { type: "spring" as const, stiffness: 320, damping: 28 },
  },
};

const BENTO = {
  stagger: 0.05,
  cell: {
    y: 12,
    scale: 0.98,
    spring: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
};

/* ───────── DATA ───────── */

type MonitorStatus = "OK" | "WARN" | "DOWN";

type Pillar = {
  kicker: string;
  title: string;
  body: string;
  anchor?: { href: string; label: string };
};

const pillars: Pillar[] = [
  {
    kicker: "FEATURE I",
    title: "It checks your links every minute.",
    body: "If a destination returns a 500, a 404, or a bad redirect, you get an email within a minute. Other shorteners count clicks. ndle tells you when clicks break.",
    anchor: { href: "#incident", label: "see a sample alert" },
  },
  {
    kicker: "FEATURE II",
    title: "Chat with your links.",
    body: "Ask which campaigns spiked this week and get a chart. Ask what broke last Tuesday and get a timeline. No dashboard to decode.",
  },
  {
    kicker: "FEATURE III",
    title: "One custom domain, free.",
    body: "Bring short.yoursite.com on the free plan. No credit card, no upgrade required.",
  },
];

const comparisonRows: Array<{
  label: string;
  ndle: string | boolean;
  bitly: string | boolean;
  dub: string | boolean;
  shortio: string | boolean;
  highlight?: boolean;
}> = [
  {
    label: "Price to start",
    ndle: "Free",
    bitly: "Free",
    dub: "Free",
    shortio: "Free",
  },
  {
    label: "Short links / month",
    ndle: "100",
    bitly: "5",
    dub: "25",
    shortio: "1,000*",
  },
  { label: "Custom domains", ndle: "1", bitly: false, dub: "3", shortio: "5" },
  { label: "QR codes", ndle: "∞", bitly: "2 / mo", dub: true, shortio: true },
  {
    label: "Uptime monitoring",
    ndle: true,
    bitly: false,
    dub: false,
    shortio: false,
    highlight: true,
  },
  {
    label: "Breakage alerts",
    ndle: true,
    bitly: false,
    dub: false,
    shortio: false,
    highlight: true,
  },
  {
    label: "Chat with analytics",
    ndle: true,
    bitly: false,
    dub: "partial",
    shortio: false,
    highlight: true,
  },
];

/* ───────── STAMPS (classification badges) ───────── */

function RatingStamp() {
  return (
    <div className="inline-flex items-stretch border border-[color:var(--pulp-ink)] text-[color:var(--pulp-ink)]">
      <div className="flex items-center justify-center border-r border-[color:var(--pulp-ink)] px-3 py-2">
        <span className="font-sigmar text-2xl leading-none italic">N</span>
      </div>
      <div className="flex flex-col justify-between py-1.5">
        <span className="border-b border-[color:var(--pulp-ink)] px-2.5 py-0.5 text-[8px] font-bold tracking-[0.2em] uppercase">
          link monitor
        </span>
        <span className="px-2.5 py-0.5 text-[8px] font-semibold tracking-[0.15em] uppercase">
          checked every 60s
          <br />
          from 4 regions
        </span>
      </div>
    </div>
  );
}

function OvalStamp({
  label,
  center,
  sub,
}: {
  label: string;
  center: string;
  sub: string;
}) {
  return (
    <div className="inline-flex flex-col items-end gap-1 text-[color:var(--pulp-ink)]">
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase">
        {label}
      </div>
      <div
        className="flex items-center justify-center border border-[color:var(--pulp-ink)] px-3 py-1 text-[9px] font-bold tracking-[0.25em] uppercase"
        style={{ borderRadius: "50% / 60%" }}
      >
        {center}
      </div>
      <div className="text-right text-[8px] font-semibold tracking-[0.2em] uppercase">
        {sub}
      </div>
    </div>
  );
}

/* ───────── SHARED ATOMS ───────── */

function Cell({ value }: { value: string | boolean }) {
  if (value === true)
    return (
      <span className="inline-flex items-center gap-1 font-semibold">
        <CheckIcon
          weight="bold"
          className="size-3.5 text-[color:var(--pulp-orange)]"
        />
        <span className="text-xs tracking-wider uppercase">yes</span>
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex items-center gap-1 text-[color:var(--pulp-ink)]/50">
        <XIcon weight="bold" className="size-3.5" />
        <span className="text-xs tracking-wider uppercase">no</span>
      </span>
    );
  if (value === "partial")
    return (
      <span className="inline-flex items-center gap-1 text-[color:var(--pulp-ink)]/70">
        <MinusIcon weight="bold" className="size-3.5" />
        <span className="text-xs tracking-wider uppercase">partial</span>
      </span>
    );
  return (
    <span className="text-sm font-semibold text-[color:var(--pulp-ink)]">
      {value}
    </span>
  );
}

function Row({
  children,
  highlight,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1.3fr_repeat(4,_1fr)] items-center gap-2 border-t border-[color:var(--pulp-ink)]/15 px-4 py-3.5 ${
        highlight ? "bg-[color:var(--pulp-yellow)]/25" : ""
      }`}
    >
      {children}
    </div>
  );
}

type YourLink = { slug: string; latencyMs: number } | null;

/* ───────── ACT I — DATA + COMPONENTS ───────── */

type WatchedLink = {
  slug: string;
  destination: string;
  status: MonitorStatus;
  latencyMs: number | null;
  lastCheckSec: number;
  regionsOk: number; // of 4 total
  uptime30d: number; // percentage, 0-100
};

const watchedLinks: WatchedLink[] = [
  {
    slug: "ndle.im/launch",
    destination: "mysite.com/product-launch-2026",
    status: "OK",
    latencyMs: 47,
    lastCheckSec: 12,
    regionsOk: 4,
    uptime30d: 99.87,
  },
  {
    slug: "ndle.im/docs",
    destination: "docs.mycompany.com/getting-started",
    status: "OK",
    latencyMs: 68,
    lastCheckSec: 18,
    regionsOk: 4,
    uptime30d: 99.92,
  },
  {
    slug: "ndle.im/blog",
    destination: "blog.mycompany.com/latest-post",
    status: "WARN",
    latencyMs: 481,
    lastCheckSec: 7,
    regionsOk: 3,
    uptime30d: 97.1,
  },
  {
    slug: "ndle.im/pricing",
    destination: "mysite.com/pricing",
    status: "OK",
    latencyMs: 32,
    lastCheckSec: 22,
    regionsOk: 4,
    uptime30d: 99.99,
  },
  {
    slug: "ndle.im/careers",
    destination: "mysite.com/careers/senior-engineer",
    status: "DOWN",
    latencyMs: null,
    lastCheckSec: 31,
    regionsOk: 0,
    uptime30d: 92.4,
  },
  {
    slug: "ndle.im/changelog",
    destination: "mysite.com/changelog",
    status: "OK",
    latencyMs: 19,
    lastCheckSec: 15,
    regionsOk: 4,
    uptime30d: 99.8,
  },
];

/* ───── 3-step flow chips (shorten → watch → alert) ───── */

function FlowChips({ inView }: { inView: boolean }) {
  const chips = [
    { num: "01", title: "shorten", body: "long URL to 8 characters" },
    { num: "02", title: "watch", body: "every 60s · 4 regions" },
    { num: "03", title: "alert", body: "email the moment it breaks" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {chips.map((c, i) => (
        <motion.div
          key={c.num}
          className="flex items-center gap-3 rounded-md border-2 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-cream)] px-4 py-3 shadow-[3px_3px_0_0_var(--pulp-ink)]"
          initial={{ opacity: 0, x: -8 }}
          animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
          transition={{ duration: 0.28, delay: 0.1 + i * 0.1 }}
        >
          <span className="font-sigmar text-2xl leading-none text-[color:var(--pulp-orange)] italic">
            {c.num}
          </span>
          <div>
            <p className="font-sigmar text-base leading-none text-[color:var(--pulp-ink)] italic">
              {c.title}
            </p>
            <p className="mt-0.5 font-mono text-[10px] tracking-[0.14em] text-[color:var(--pulp-ink)]/65 uppercase">
              {c.body}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ───── Watch-list rendered on a self-healing cutting mat (rulers + two-level grid) ───── */

// Ruler along the top edge — numbered markings every 5 units + tick marks between
function RulerTop() {
  // 8 major marks across the top (0, 5, 10, ... 35)
  const majors = [0, 5, 10, 15, 20, 25, 30, 35];
  // Ticks — 36 total, longer at every 5th
  const ticks = Array.from({ length: 36 });
  return (
    <>
      {/* Numbers */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-12 right-12 top-2 flex justify-between font-mono text-[9px] font-semibold text-white/55 tabular-nums"
      >
        {majors.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      {/* Tick marks */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-12 right-12 top-[22px] flex justify-between"
      >
        {ticks.map((_, i) => (
          <span
            key={i}
            className={`${i % 5 === 0 ? "h-2 w-px bg-white/50" : "h-1 w-px bg-white/30"}`}
          />
        ))}
      </div>
    </>
  );
}

// Ruler along the left edge — numbered markings + tick marks down the side
function RulerLeft() {
  const majors = [0, 5, 10, 15, 20, 25, 30, 35];
  const ticks = Array.from({ length: 36 });
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute left-2 top-12 bottom-12 flex flex-col justify-between font-mono text-[9px] font-semibold text-white/55 tabular-nums"
      >
        {majors.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute left-[22px] top-12 bottom-12 flex flex-col justify-between"
      >
        {ticks.map((_, i) => (
          <span
            key={i}
            className={`${i % 5 === 0 ? "h-px w-2 bg-white/50" : "h-px w-1 bg-white/30"}`}
          />
        ))}
      </div>
    </>
  );
}

// Formatted slug — domain dimmed, slug-path bright.
// "ndle.im/launch" → <span class="dim">ndle.im/</span><span>launch</span>
function SlugText({ slug, className = "" }: { slug: string; className?: string }) {
  const slashIdx = slug.indexOf("/");
  const domain = slashIdx > -1 ? slug.slice(0, slashIdx + 1) : slug;
  const path   = slashIdx > -1 ? slug.slice(slashIdx + 1) : "";
  return (
    <span className={`truncate ${className}`}>
      <span className="opacity-55">{domain}</span>
      <span className="font-bold">{path}</span>
    </span>
  );
}

function WatchListLedger({
  yourLink,
  inView,
}: {
  yourLink: YourLink;
  inView: boolean;
}) {
  const mat = "var(--poster)";

  // Status pill tuned for a warm-white paper card (dark ink on light pastel bg)
  function whiteStatus(status: MonitorStatus) {
    switch (status) {
      case "OK":
        return { label: "UP",   bg: "bg-[oklch(0.9_0.06_145)]", text: "text-[oklch(0.35_0.15_145)]", dot: "bg-[oklch(0.6_0.18_145)]" };
      case "WARN":
        return { label: "SLOW", bg: "bg-[oklch(0.93_0.07_75)]", text: "text-[oklch(0.42_0.15_60)]",  dot: "bg-[color:var(--pulp-orange)]" };
      case "DOWN":
        return { label: "DOWN", bg: "bg-[oklch(0.92_0.04_25)]", text: "text-[oklch(0.42_0.2_25)]",   dot: "bg-[oklch(0.55_0.22_25)]" };
    }
  }

  // Shared column grid — declared once, reused by header + rows for perfect alignment
  const COLS = "grid grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.3fr)_4.5rem_3.5rem_4.5rem] items-center gap-4";

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={inView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 20, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {/* ─── Layer 1: Blue self-healing cutting mat (bg + rulers + grid) ─── */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-[0_10px_24px_rgba(0,0,0,0.35),0_24px_50px_rgba(0,0,0,0.2)]"
        style={{
          backgroundColor: mat,
          backgroundImage: `
            /* Subtle 45° diagonal reference lines — classic cutting-mat detail */
            linear-gradient( 45deg, transparent 49.7%, rgba(255,255,255,0.06) 49.7%, rgba(255,255,255,0.06) 50.3%, transparent 50.3%),
            linear-gradient(-45deg, transparent 49.7%, rgba(255,255,255,0.06) 49.7%, rgba(255,255,255,0.06) 50.3%, transparent 50.3%),
            /* Bold 5-unit grid */
            linear-gradient(to right,  rgba(255,255,255,0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px),
            /* Fine 1-unit grid */
            linear-gradient(to right,  rgba(255,255,255,0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 100px 100px, 100px 100px, 20px 20px, 20px 20px",
        }}
      >
        {/* Rulers along top & left edges of the mat */}
        <RulerTop />
        <RulerLeft />

        {/* ─── Layer 2: White paper card floating on the mat ─── */}
        <div
          className="relative ml-14 mr-8 mb-8 mt-12 overflow-hidden rounded-xl text-[color:var(--pulp-ink)] ring-1 ring-black/5 shadow-[0_6px_18px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.08)]"
          style={{ backgroundColor: "var(--pulp-cream)" }}
        >
          {/* Title block */}
          <header className="px-8 pt-6 pb-5">
            <p className="font-mono text-[9px] font-bold tracking-[0.3em] uppercase opacity-55">
              ndle monitoring <span className="opacity-60">·</span> live
            </p>
            <h3 className="mt-1.5 font-sigmar text-4xl leading-[1] italic tracking-tight">
              Monitored links
            </h3>
          </header>

          {/* Double-rule divider — header → body */}
          <div className="mx-8 border-t border-black/20" />
          <div className="mx-8 border-t border-black/10" style={{ marginTop: "2px" }} />

          {/* Column headers */}
          <div
            className={`${COLS} px-8 py-2.5 font-mono text-[9px] font-bold tracking-[0.18em] uppercase opacity-55`}
          >
            <span>№</span>
            <span>slug</span>
            <span>destination</span>
            <span>status</span>
            <span className="text-right">last</span>
            <span className="text-right">uptime 30d</span>
          </div>

          {/* Rows */}
          <ul className="divide-y divide-black/10">
            {watchedLinks.map((d, i) => {
              const s = whiteStatus(d.status);
              return (
                <motion.li
                  key={d.slug}
                  className={`${COLS} px-8 py-2.5 font-mono text-[12px] leading-none`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -6 }}
                  transition={{ duration: 0.22, delay: 0.3 + i * 0.07 }}
                >
                  <span className="font-bold tabular-nums opacity-45">
                    {(i + 1).toString().padStart(3, "0")}
                  </span>
                  <SlugText slug={d.slug} />
                  <span className="truncate opacity-65">{d.destination}</span>
                  <span
                    className={`inline-flex min-w-[3.75rem] items-center justify-center gap-1.5 rounded-sm ${s.bg} px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.14em] uppercase ${s.text}`}
                  >
                    <span className={`size-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                  <span className="text-right tabular-nums opacity-65">
                    {d.lastCheckSec}s
                  </span>
                  <span className="text-right font-bold tabular-nums">
                    {d.uptime30d.toFixed(2)}
                    <span className="opacity-50">%</span>
                  </span>
                </motion.li>
              );
            })}

            {yourLink && (
              <motion.li
                className={`${COLS} bg-[color:var(--pulp-yellow)]/35 px-8 py-3 font-mono text-[12px] leading-none ring-1 ring-[color:var(--pulp-orange)]/50 ring-inset`}
                initial={{ opacity: 0, x: -20, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 360, damping: 20 }}
              >
                <span className="font-bold tabular-nums text-[color:var(--pulp-orange)]">
                  007
                </span>
                <SlugText slug={yourLink.slug} />
                <span className="truncate opacity-70">your link</span>
                <span className="inline-flex min-w-[3.75rem] items-center justify-center gap-1.5 rounded-sm bg-[color:var(--pulp-orange)]/20 px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.14em] uppercase text-[color:var(--pulp-orange)]">
                  <span className="animate-live-blip size-1.5 rounded-full bg-[color:var(--pulp-orange)]" />
                  NEW
                </span>
                <span className="text-right tabular-nums opacity-65">0s</span>
                <span className="text-right font-bold tabular-nums">—</span>
              </motion.li>
            )}
          </ul>

          {/* Footer — info strip */}
          <div className="mx-8 border-t border-black/20" />
          <div className="mx-8 border-t border-black/10" style={{ marginTop: "2px" }} />
          <div className="flex items-center justify-between gap-4 px-8 py-3 font-mono text-[9px] font-bold tracking-[0.2em] uppercase opacity-55">
            <span>
              checking every 60s <span className="opacity-70">·</span> 4 regions
            </span>
            <span className="flex items-center gap-3">
              us-east-1 <span className="opacity-60">·</span> eu-west-2{" "}
              <span className="opacity-60">·</span> ap-south-1{" "}
              <span className="opacity-60">·</span> us-west-2
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ───────── ACT I — THE EVIDENCE ROOM ───────── */

function ActOne({
  url,
  setUrl,
  handleShorten,
  submitting,
  formError,
  yourLink,
  copied,
  copyShortLink,
  urlLooksValid,
}: {
  url: string;
  setUrl: (s: string) => void;
  handleShorten: (e: React.FormEvent) => void;
  submitting: boolean;
  formError: string | null;
  yourLink: YourLink;
  copied: boolean;
  copyShortLink: () => void;
  urlLooksValid: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });

  return (
    <section
      ref={ref}
      className="relative z-10 border-y-4 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-cream)] py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        {/* Header + form row */}
        <div className="mb-12 grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <h2 className="font-sigmar text-pulp-sm text-5xl leading-[0.95] text-[color:var(--pulp-orange)] italic md:text-7xl">
              Shorten a link.
              <br />
              No sign-up.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[color:var(--pulp-ink)]/80">
              Paste a URL. ndle shortens it and checks the destination every
              minute from four regions. If it breaks, you get an email.
            </p>
          </div>

          {/* Form — sits next to the header on lg, stacks below on sm */}
          <div className="space-y-3">
            <form
              onSubmit={handleShorten}
              className="group relative flex w-full items-stretch overflow-hidden rounded-md border-2 border-[color:var(--pulp-ink)] bg-white shadow-[4px_4px_0_0_var(--pulp-ink)] transition-shadow focus-within:shadow-[6px_6px_0_0_var(--pulp-orange)]"
            >
              <span
                aria-hidden
                className={`flex w-9 items-center justify-center text-sm font-bold transition-colors duration-200 ${
                  urlLooksValid
                    ? "text-[oklch(0.5_0.18_145)]"
                    : "text-[color:var(--pulp-ink)]/40"
                }`}
              >
                <motion.span
                  key={urlLooksValid ? "valid" : "pending"}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                >
                  {urlLooksValid ? "✓" : "▸"}
                </motion.span>
              </span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/a-long-page-url"
                className="flex-1 bg-transparent py-3.5 pr-3 text-sm text-[color:var(--pulp-ink)] outline-none placeholder:text-[color:var(--pulp-ink)]/40"
                aria-label="URL to shorten"
                aria-invalid={formError ? true : undefined}
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 border-l-2 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-orange)] px-5 text-xs font-bold tracking-[0.18em] text-[color:var(--pulp-cream)] uppercase transition-transform active:translate-x-px active:translate-y-px disabled:opacity-80"
              >
                {submitting ? "shortening…" : "shorten"}
                {submitting ? (
                  <span
                    aria-hidden
                    className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                  />
                ) : (
                  <ArrowRightIcon className="size-3.5" />
                )}
              </button>
            </form>

            {formError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[11px] font-bold tracking-[0.2em] text-[oklch(0.55_0.22_25)] uppercase"
              >
                ● {formError}
              </motion.p>
            )}

            {yourLink && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 28 }}
                className="relative flex items-center justify-between gap-3 rounded-md border-2 border-[color:var(--pulp-orange)] bg-[color:var(--pulp-yellow)]/35 px-3 py-2.5"
              >
                {/* SHORTENED ink-slam overlay — plays once when the result card appears */}
                <motion.span
                  aria-hidden
                  className="font-sigmar pointer-events-none absolute -top-3 -right-3 z-10 border-[3px] border-[color:var(--pulp-orange)] bg-[color:var(--pulp-cream)] px-2 py-0.5 text-sm text-[color:var(--pulp-orange)] italic select-none"
                  style={{ letterSpacing: "0.12em" }}
                  initial={{ scale: 1.9, opacity: 0, rotate: -45 }}
                  animate={{ scale: 1, opacity: 0.95, rotate: -8 }}
                  transition={{
                    type: "spring",
                    stiffness: 320,
                    damping: 15,
                    delay: 0.18,
                  }}
                >
                  SHORTENED
                </motion.span>

                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold tracking-[0.22em] text-[color:var(--pulp-ink)] uppercase">
                    ● shortened · added to the monitored links below
                  </p>
                  <p className="font-sigmar truncate text-lg text-[color:var(--pulp-ink)] italic">
                    {yourLink.slug}
                  </p>
                </div>
                <motion.button
                  onClick={copyShortLink}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 600, damping: 20 }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border-2 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-cream)] px-2.5 py-1.5 text-[10px] font-bold tracking-[0.2em] text-[color:var(--pulp-ink)] uppercase transition-colors hover:bg-[color:var(--pulp-ink)] hover:text-[color:var(--pulp-yellow)]"
                  aria-label="Copy short link"
                  aria-live="polite"
                >
                  {copied ? (
                    <motion.span
                      key="done"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 18,
                      }}
                      className="inline-flex items-center gap-1.5"
                    >
                      <CheckIcon weight="bold" className="size-3" /> copied
                    </motion.span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <CopyIcon weight="bold" className="size-3" /> copy
                    </span>
                  )}
                </motion.button>
              </motion.div>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-[10px] font-bold tracking-[0.2em] text-[color:var(--pulp-ink)]/60 uppercase">
              {["no credit card", "100 free links", "1 custom domain"].map(
                (label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5"
                  >
                    <CheckIcon className="size-3 text-[color:var(--pulp-orange)]" />{" "}
                    {label}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Flow chips — teach the "shorten → watch → alert" loop */}
        <div className="mt-14">
          <FlowChips inView={inView} />
        </div>

        {/* Watch list — real monitoring data in a pulp case-book ledger */}
        <div className="mt-10">
          <WatchListLedger yourLink={yourLink} inView={inView} />
        </div>
      </div>
    </section>
  );
}

/* ───────── ACT II — THE FEATURES (bento + pillars merged into scenes) ───────── */

function BentoCell({
  children,
  className = "",
  index = 0,
  inView,
}: {
  children: React.ReactNode;
  className?: string; // callers pass static Tailwind grid utilities
  index?: number;
  inView: boolean;
}) {
  return (
    <motion.div
      className={`relative overflow-hidden rounded-lg border-2 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-cream)] p-6 shadow-[4px_4px_0_0_var(--pulp-ink)] md:p-8 ${className}`}
      initial={{ opacity: 0, y: BENTO.cell.y, scale: BENTO.cell.scale }}
      animate={
        inView
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: BENTO.cell.y, scale: BENTO.cell.scale }
      }
      transition={{ ...BENTO.cell.spring, delay: index * BENTO.stagger }}
    >
      {children}
    </motion.div>
  );
}

function BentoStat({ label }: { label: string }) {
  return (
    <span className="text-[10px] font-bold tracking-[0.22em] text-[color:var(--pulp-ink)]/60 uppercase">
      ● {label}
    </span>
  );
}

function ActTwoBento() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const featureChips = [
    "API access",
    "UTM builder",
    "Link tags",
    "Password links",
    "Webhooks",
    "CSV export",
    "Team-ready",
  ];

  const bigNumber =
    "font-sigmar text-pulp-sm text-6xl leading-none text-[color:var(--pulp-orange)] italic";
  const smallCaps =
    "text-[10px] font-bold tracking-[0.18em] text-[color:var(--pulp-ink)]/60 uppercase";

  return (
    <section
      ref={ref}
      className="paper-grain relative z-10 overflow-hidden bg-[color:var(--poster)] py-20 lg:py-24"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <h2 className="font-sigmar text-pulp-sm text-5xl leading-[0.95] text-[color:var(--pulp-yellow)] italic md:text-7xl">
            What the free
            <br />
            plan includes.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:auto-rows-fr md:grid-cols-4">
          {/* QR — 2x2 */}
          <BentoCell
            index={0}
            inView={inView}
            className="flex flex-col justify-between md:col-span-2 md:row-span-2"
          >
            <div className="flex items-center justify-between">
              <BentoStat label="QR · ndle.im/demo" />
              <span className="text-[10px] text-[color:var(--pulp-ink)]/50">
                164 × 164
              </span>
            </div>
            <div className="my-6 flex items-center justify-center">
              <QRCodeSVG
                value="https://ndle.app"
                size={164}
                level="M"
                bgColor="transparent"
                fgColor="var(--pulp-ink)"
              />
            </div>
            <div>
              <p className="font-sigmar text-3xl leading-tight text-[color:var(--pulp-orange)] italic">
                A QR code for every link.
              </p>
              <p className="mt-1 text-sm text-[color:var(--pulp-ink)]/75">
                Unlimited and tracked, on the free plan.
              </p>
            </div>
          </BentoCell>

          {/* 100 links */}
          <BentoCell
            index={1}
            inView={inView}
            className="flex flex-col justify-between"
          >
            <BentoStat label="short links" />
            <div className="py-4">
              <span className={bigNumber}>100</span>
            </div>
            <span className={smallCaps}>per month</span>
          </BentoCell>

          {/* 1 domain */}
          <BentoCell
            index={2}
            inView={inView}
            className="flex flex-col justify-between"
          >
            <BentoStat label="custom domain" />
            <div className="py-4">
              <span className={bigNumber}>1</span>
            </div>
            <span className={smallCaps}>bring your own</span>
          </BentoCell>

          {/* monitoring — dark inverted cell */}
          <BentoCell
            index={3}
            inView={inView}
            className="flex flex-col justify-between !border-[color:var(--pulp-ink)] !bg-[color:var(--pulp-ink)] text-[color:var(--pulp-cream)] md:col-span-2"
          >
            <span className="text-[10px] font-bold tracking-[0.22em] text-[color:var(--pulp-yellow)] uppercase">
              <span className="animate-live-blip mr-1">●</span>
              uptime monitoring
            </span>
            <div className="flex items-baseline gap-4 py-3">
              <span className="font-sigmar text-pulp-sm text-6xl leading-none text-[color:var(--pulp-yellow)] italic">
                60s
              </span>
              <span className="font-sigmar text-xl text-[color:var(--pulp-cream)]/70 italic">
                between checks
              </span>
            </div>
            <p className="text-sm leading-6 text-[color:var(--pulp-cream)]/75">
              Every destination is checked from four regions. If one fails, you
              get an email.
            </p>
          </BentoCell>

          {/* $0 */}
          <BentoCell
            index={4}
            inView={inView}
            className="flex flex-col justify-between"
          >
            <BentoStat label="to start" />
            <div className="py-4">
              <span className={bigNumber}>$0</span>
            </div>
            <span className={smallCaps}>no card · no trial</span>
          </BentoCell>

          {/* Chips */}
          <BentoCell
            index={5}
            inView={inView}
            className="flex flex-col justify-between md:col-span-3"
          >
            <BentoStat label="also included" />
            <ul className="flex flex-wrap gap-1.5 py-2">
              {featureChips.map((feat) => (
                <li
                  key={feat}
                  className="inline-flex items-center gap-1 rounded-sm border border-[color:var(--pulp-ink)]/20 bg-white px-2 py-1 text-[10px] font-bold tracking-[0.18em] text-[color:var(--pulp-ink)] uppercase"
                >
                  <CheckIcon
                    weight="bold"
                    className="size-3 text-[color:var(--pulp-orange)]"
                  />
                  {feat}
                </li>
              ))}
            </ul>
            <span className={smallCaps}>on every plan</span>
          </BentoCell>
        </div>
      </div>
    </section>
  );
}

/* ───────── ACT II — FEATURES (pillars, cream scene) ───────── */

function PillarsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="features"
      ref={ref}
      className="relative z-10 border-y-4 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-cream)] py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          className="mb-14 max-w-3xl"
          initial={{ opacity: 0, y: PILLARS.header.y }}
          animate={
            inView ? { opacity: 1, y: 0 } : { opacity: 0, y: PILLARS.header.y }
          }
          transition={{ ...PILLARS.header.spring, delay: PILLARS.header.delay }}
        >
          <h2 className="font-sigmar text-pulp-sm text-5xl leading-[0.95] text-[color:var(--pulp-orange)] italic md:text-7xl">
            The work a shortener
            <br />
            should do.
          </h2>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => (
            <motion.article
              key={p.kicker}
              className="paper-grain relative flex flex-col overflow-hidden rounded-lg border-2 border-[color:var(--pulp-ink)] bg-[color:var(--poster)] p-7 text-[color:var(--pulp-cream)] shadow-[6px_6px_0_0_var(--pulp-orange)] md:p-8"
              initial={{
                opacity: 0,
                y: PILLARS.card.y,
                scale: PILLARS.card.scale,
              }}
              animate={
                inView
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: PILLARS.card.y, scale: PILLARS.card.scale }
              }
              transition={{
                ...PILLARS.card.spring,
                delay: PILLARS.card.baseDelay + i * PILLARS.card.stagger,
              }}
            >
              <div className="relative z-10 mb-6 flex items-start">
                <span className="inline-flex h-7 items-center border border-current px-2 text-[10px] font-bold tracking-[0.3em] uppercase">
                  {p.kicker}
                </span>
              </div>
              <h3 className="font-sigmar relative z-10 text-2xl leading-tight text-[color:var(--pulp-yellow)] italic md:text-3xl">
                {p.title}
              </h3>
              <p className="relative z-10 mt-4 text-sm leading-6 text-[color:var(--pulp-cream)]/85">
                {p.body}
              </p>
              {p.anchor && (
                <Link
                  href={p.anchor.href}
                  className="relative z-10 mt-5 inline-flex items-center gap-1.5 self-start border-b border-[color:var(--pulp-yellow)]/50 pb-0.5 font-mono text-[10px] font-bold tracking-[0.22em] text-[color:var(--pulp-yellow)] uppercase transition-colors hover:border-[color:var(--pulp-yellow)] hover:text-[color:var(--pulp-yellow)]"
                >
                  ↓ {p.anchor.label}
                </Link>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── ACT IV — THE VERDICT (comparison, cream scene) ───────── */

function CompareSection() {
  return (
    <section
      id="compare"
      className="relative z-10 bg-[color:var(--pulp-cream)] py-20 lg:py-24"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <h2 className="font-sigmar text-pulp-sm text-5xl leading-[0.95] text-[color:var(--pulp-orange)] italic md:text-7xl">
            Free plan,
            <br />
            compared.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-[color:var(--pulp-ink)]/70">
            Free tiers side by side. Competitor numbers are from their public
            pricing pages, April 2026.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border-2 border-[color:var(--pulp-ink)] shadow-[6px_6px_0_0_var(--pulp-ink)]">
          <div className="grid grid-cols-[1.3fr_repeat(4,_1fr)] gap-2 bg-[color:var(--pulp-ink)] px-4 py-3 text-[10px] font-bold tracking-[0.18em] text-[color:var(--pulp-cream)]/70 uppercase">
            <span>Feature</span>
            <span className="font-sigmar text-base tracking-normal text-[color:var(--pulp-yellow)] normal-case italic">
              ndle
            </span>
            <span>Bitly</span>
            <span>Dub</span>
            <span>Short.io</span>
          </div>
          <div className="bg-white">
            {comparisonRows.map((r) => (
              <Row key={r.label} highlight={r.highlight}>
                <span className="text-sm font-semibold text-[color:var(--pulp-ink)]">
                  {r.label}
                </span>
                <Cell value={r.ndle} />
                <Cell value={r.bitly} />
                <Cell value={r.dub} />
                <Cell value={r.shortio} />
              </Row>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-semibold tracking-[0.18em] text-[color:var(--pulp-ink)]/60 uppercase">
          <span>
            ● highlighted rows: only ndle includes these on a free plan.
          </span>
          <span>
            * Short.io caps at 50k tracked clicks/mo · public plans, April 2026
          </span>
        </div>
      </div>
    </section>
  );
}

/* ───────── THE INCIDENT (alert email — vintage memo paper, email-voice copy) ───────── */

function Memo({ inView }: { inView: boolean }) {
  const paperInk = "oklch(0.22 0.03 55)"; // sepia typewriter ink
  const stampRed = "oklch(0.5 0.22 28)";
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 28, rotate: 0, scale: 0.98 }}
      animate={
        inView
          ? { opacity: 1, y: 0, rotate: 0.6, scale: 1 }
          : { opacity: 0, y: 28, rotate: 0, scale: 0.98 }
      }
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div
        className="relative overflow-hidden rounded-sm border border-[oklch(0.82_0.02_85)] shadow-[0_10px_24px_rgba(0,0,0,0.3),0_24px_50px_rgba(0,0,0,0.18)]"
        style={{
          color: paperInk,
          backgroundColor: "oklch(0.96 0.015 85)",
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.82 0.02 85 / 0.3) 0.6px, transparent 1px)",
          backgroundSize: "6px 6px",
        }}
      >
        {/* Letterhead — memo paper header */}
        <div
          className="border-b-[3px] border-double px-7 py-5"
          style={{ borderColor: paperInk }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold tracking-[0.32em] uppercase">
              ndle monitoring
            </p>
            <p className="text-[9px] font-bold tracking-[0.32em] uppercase">
              automated alert
            </p>
          </div>
          <h3 className="font-sigmar mt-2 text-3xl leading-none italic">
            Alert: Link Down
          </h3>
        </div>

        {/* Form block — memo headers written as email headers */}
        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-4 gap-y-2 px-7 pt-5 pb-4 font-mono text-[12px]">
          {(
            [
              {
                k: "To:",
                v: <span className="tabular-nums">you@team.com</span>,
              },
              {
                k: "From:",
                v: <span className="tabular-nums">alerts@ndle.im</span>,
              },
              {
                k: "Date:",
                v: (
                  <span className="tabular-nums">
                    Thu, Mar 12, 2026 · 03:04 AM UTC
                  </span>
                ),
              },
              {
                k: "Subject:",
                v: (
                  <>
                    <span className="font-bold" style={{ color: stampRed }}>
                      [DOWN]
                    </span>{" "}
                    ndle.im/launch is not responding
                  </>
                ),
              },
            ] as const
          ).map(({ k, v }) => (
            <Fragment key={k}>
              <dt className="font-bold tracking-[0.08em] uppercase opacity-70">
                {k}
              </dt>
              <dd>{v}</dd>
            </Fragment>
          ))}
        </dl>

        <div
          className="mx-7 border-t border-dashed"
          style={{ borderColor: `${paperInk}66` }}
        />

        {/* Body — reads like a real alert email */}
        <div className="relative space-y-4 px-7 py-5 font-mono text-[12.5px] leading-[1.8]">
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: 0.24, delay: 0.45, ease: "easeOut" }}
          >
            Hi,
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: 0.24, delay: 0.6, ease: "easeOut" }}
          >
            One of your short links, <strong>ndle.im/launch</strong>, stopped
            responding at <strong>03:04 AM UTC</strong> this morning.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: 0.24, delay: 0.78, ease: "easeOut" }}
            className="space-y-1"
          >
            <p className="text-[10.5px] font-bold tracking-[0.18em] uppercase opacity-65">
              What we&apos;re seeing
            </p>
            <ul className="space-y-0.5 pl-1">
              <li>
                · Error: <strong>503 Service Unavailable</strong>
              </li>
              <li>· Regions affected: 2 of 4 (us-east-1, eu-west-2)</li>
              <li>· Duration: 4m 12s, ongoing</li>
            </ul>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: 0.24, delay: 0.95, ease: "easeOut" }}
          >
            We&apos;ll keep checking every 60 seconds and email you again when
            it&apos;s back online.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 0.7 } : { opacity: 0 }}
            transition={{ duration: 0.24, delay: 1.1 }}
            className="text-[11px]"
          >
            If you took the link down on purpose, you can mute alerts for this
            link from your dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
            transition={{ duration: 0.24, delay: 1.22, ease: "easeOut" }}
            className="pt-3"
          >
            <p>
              <strong>ndle</strong> monitoring
            </p>
            <p className="opacity-65">alerts@ndle.im</p>
          </motion.div>

          {/* URGENT rubber stamp — slaps onto the body after the email types in */}
          <motion.span
            aria-hidden
            className="font-sigmar pointer-events-none absolute top-6 right-7 border-[3px] px-3 py-0.5 text-xl italic select-none"
            style={{
              letterSpacing: "0.1em",
              borderColor: stampRed,
              color: stampRed,
            }}
            initial={{ opacity: 0, scale: 1.9, rotate: -45 }}
            animate={
              inView
                ? { opacity: 0.82, scale: 1, rotate: 10 }
                : { opacity: 0, scale: 1.9, rotate: -45 }
            }
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 13,
              delay: 1.4,
            }}
          >
            URGENT
          </motion.span>
        </div>

      </div>
    </motion.div>
  );
}

function AlertEmailSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="incident"
      ref={ref}
      className="paper-grain relative z-10 scroll-mt-6 overflow-hidden border-y-4 border-[color:var(--pulp-ink)]"
      // Pulp-cream card bg + cobalt "ink" override — cascades to text-pulp shadow, borders, small text, CTAs
      style={
        {
          backgroundColor: "var(--pulp-cream)",
          ["--pulp-ink" as string]: "oklch(0.32 0.22 268)",
        } as React.CSSProperties
      }
    >
      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8 lg:py-24">
        <div className="space-y-6 text-[color:var(--pulp-ink)]">
          <h2
            className="font-sigmar text-pulp text-5xl leading-[0.95] italic md:text-7xl"
            style={{ color: "oklch(0.7 0.24 145)" }}
          >
            3:04 AM.
            <br />
            Your link
            <br />
            starts failing.
          </h2>
          <p className="max-w-md text-sm leading-7 text-[color:var(--pulp-ink)]/85">
            ndle checks your destinations from four regions every minute. If
            one fails, whether from an expired SSL certificate, a 503, or a
            deleted page, you get this email. Usually before anyone clicks.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="gap-2 border-2 border-[color:var(--pulp-ink)] bg-[oklch(0.7_0.24_145)] text-[color:var(--pulp-ink)] shadow-[4px_4px_0_0_var(--pulp-ink)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[oklch(0.65_0.24_145)] hover:text-[color:var(--pulp-ink)] hover:shadow-[2px_2px_0_0_var(--pulp-ink)]"
            >
              <Link href="/sign-up?redirect_url=/dashboard">
                Start watching for free
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Memo inView={inView} />
      </div>
    </section>
  );
}

/* ───────── PAGE ───────── */

const onDotPaletteDark = {
  on: "var(--pulp-yellow)",
  off: "oklch(0.3 0.06 320)",
};

/* Footer wordmark — vintage marquee that auto-loops its switch-on animation
   every 4 seconds while the footer is in view. Clicking replays it instantly. */
function FooterWordmark() {
  const ref = useRef<HTMLButtonElement>(null);
  const inView = useInView(ref, { margin: "-10%" });
  const [plays, setPlays] = useState(0);

  useEffect(() => {
    if (!inView) return;

    // Respect prefers-reduced-motion — motion-sensitive users get no auto-loop.
    // (CSS also disables the keyframe itself for these users — this skips the re-renders too.)
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Fire one play immediately when the footer enters view
    setPlays((p) => p + 1);
    // Then loop on an 8-second cadence (1s animation + ~7s "rest" — reminder, not spectacle)
    const id = setInterval(() => setPlays((p) => p + 1), 8000);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <button
      type="button"
      ref={ref}
      onClick={() => setPlays((p) => p + 1)}
      aria-label="Flick the ndle sign"
      title="click the sign"
      className="inline-block cursor-pointer rounded-sm transition-transform outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pulp-yellow)]/50 active:scale-[0.985]"
    >
      <div key={plays} className="animate-bulb-switch">
        <NdleDotMatrix
          rows={7}
          cols={22}
          size={4}
          gap={1.5}
          palette={onDotPaletteDark}
        />
      </div>
    </button>
  );
}

export function PublicHome() {
  const { isSignedIn } = useAuth();
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState(0);
  const [yourLink, setYourLink] = useState<YourLink>(null);
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createGuestUrl = useMutation(api.urlMainFuction.createGuestUrl);

  // Does the current input look like a URL we can shorten? Drives the ▸/✓ prompt affordance.
  const urlLooksValid = useMemo(() => {
    const t = url.trim();
    if (!t) return false;
    try {
      const n = /^https?:\/\//i.test(t) ? t : `https://${t}`;
      const p = new URL(n);
      return /^https?:$/.test(p.protocol) && p.hostname.includes(".");
    } catch {
      return false;
    }
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    ensureGuestSession()
      .then((session) => {
        if (!cancelled) {
          setGuestSession(session);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFormError(
            error instanceof Error
              ? error.message
              : "guest mode is unavailable right now.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setStage(1), HERO_TIMING.stamps));
    timers.push(setTimeout(() => setStage(2), HERO_TIMING.production));
    timers.push(setTimeout(() => setStage(3), HERO_TIMING.line1));
    timers.push(setTimeout(() => setStage(4), HERO_TIMING.line2));
    timers.push(setTimeout(() => setStage(5), HERO_TIMING.subtitle));
    timers.push(setTimeout(() => setStage(6), HERO_TIMING.form));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setFormError("paste a URL first.");
      return;
    }
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    try {
      const parsed = new URL(normalized);
      if (
        !/^https?:$/.test(parsed.protocol) ||
        !parsed.hostname.includes(".")
      ) {
        throw new Error("bad url");
      }
    } catch {
      setFormError("enter a valid URL, like example.com/page.");
      return;
    }
    if (!guestSession) {
      setFormError("still connecting. try again in a moment.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createGuestUrl({
        url: normalized,
        guestId: guestSession.guestId,
        guestToken: guestSession.guestToken,
      });
      const fakeLatency = Math.floor(Math.random() * 16) + 4;
      setYourLink({ slug: makeShortLink(result.slug), latencyMs: fakeLatency });
      setUrl("");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "couldn't shorten that link.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copyShortLink = async () => {
    if (!yourLink) return;
    try {
      await navigator.clipboard.writeText(`https://${yourLink.slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setFormError("copy was blocked. select the link and copy it manually.");
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-clip font-mono text-[color:var(--pulp-ink)] selection:bg-[color:var(--pulp-yellow)] selection:text-[color:var(--pulp-ink)]">
      {/* ───────── HERO (pure poster) ───────── */}
      <section className="paper-grain relative z-10 overflow-hidden bg-[color:var(--poster)] text-[color:var(--pulp-cream)]">
        {/* Nav overlaid on the poster */}
        <header className="relative z-20">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
            <Link
              href="/"
              className="flex items-center gap-3"
              aria-label="ndle home"
            >
              <span className="font-sigmar text-pulp-sm text-3xl leading-none text-[color:var(--pulp-yellow)] italic">
                ndle
              </span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-3">
              <a
                href="#features"
                className="hidden px-2 text-[11px] font-bold tracking-[0.2em] text-[color:var(--pulp-cream)]/80 uppercase hover:text-[color:var(--pulp-yellow)] sm:inline"
              >
                Features
              </a>
              <a
                href="#compare"
                className="hidden px-2 text-[11px] font-bold tracking-[0.2em] text-[color:var(--pulp-cream)]/80 uppercase hover:text-[color:var(--pulp-yellow)] sm:inline"
              >
                Compare
              </a>
              {!isSignedIn && (
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-[color:var(--pulp-cream)] hover:bg-[color:var(--pulp-cream)]/10 hover:text-[color:var(--pulp-cream)]"
                >
                  <Link href="/sign-in?redirect_url=/dashboard">Sign in</Link>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className="gap-1.5 bg-[color:var(--pulp-yellow)] text-[color:var(--pulp-ink)] hover:bg-[color:var(--pulp-yellow)]/90"
              >
                <Link
                  href={
                    isSignedIn ? "/dashboard" : "/sign-up?redirect_url=/dashboard"
                  }
                >
                  {isSignedIn ? "Dashboard" : "Get ndle"}
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </Button>
            </nav>
          </div>
        </header>

        {/* Poster body */}
        <div className="relative mx-auto max-w-7xl px-5 pt-10 pb-20 lg:px-8 lg:pt-14 lg:pb-28">
          {/* Top ribbon: stamps + "AN NDLE PRODUCTION" */}
          <div className="mb-14 flex items-start justify-between gap-4">
            <motion.div
              className="justify-self-start"
              initial={{ opacity: 0, y: HERO_STAMP.y }}
              animate={{
                opacity: stage >= 1 ? 1 : 0,
                y: stage >= 1 ? 0 : HERO_STAMP.y,
              }}
              transition={HERO_STAMP.spring}
            >
              <div className="bg-[color:var(--pulp-cream)]/95 px-0 py-0">
                <RatingStamp />
              </div>
            </motion.div>

            <motion.div
              className="justify-self-end"
              initial={{ opacity: 0, y: HERO_STAMP.y }}
              animate={{
                opacity: stage >= 1 ? 1 : 0,
                y: stage >= 1 ? 0 : HERO_STAMP.y,
              }}
              transition={{ ...HERO_STAMP.spring, delay: 0.08 }}
            >
              <div className="bg-[color:var(--pulp-cream)]/95 px-3 py-2">
                <a
                  href="https://x.com/abhishk_084"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abhishek on X"
                  className="block transition-opacity hover:opacity-80"
                >
                  <OvalStamp
                    label="made by"
                    center="abhishek"
                    sub="x.com/abhishk_084"
                  />
                </a>
              </div>
            </motion.div>
          </div>

          {/* Title */}
          <div className="py-6 text-center md:py-10">
            <motion.div
              initial={{ opacity: 0, y: HERO_LINE.y, scale: HERO_LINE.scale }}
              animate={{
                opacity: stage >= 3 ? 1 : 0,
                y: stage >= 3 ? 0 : HERO_LINE.y,
                scale: stage >= 3 ? 1 : HERO_LINE.scale,
              }}
              transition={HERO_LINE.spring}
            >
              <h1 className="font-sigmar text-pulp text-[clamp(2.5rem,8vw,5rem)] leading-[0.92] text-[color:var(--pulp-yellow)] italic">
                Short links,
              </h1>
            </motion.div>
            <motion.div
              initial={{
                opacity: 0,
                y: HERO_LINE.y + 4,
                scale: HERO_LINE.scale,
              }}
              animate={{
                opacity: stage >= 4 ? 1 : 0,
                y: stage >= 4 ? 0 : HERO_LINE.y + 4,
                scale: stage >= 4 ? 1 : HERO_LINE.scale,
              }}
              transition={HERO_LINE.spring}
              className="-mt-2 md:-mt-4"
            >
              <p className="font-sigmar text-pulp text-[clamp(4rem,15vw,10.5rem)] leading-[0.88] tracking-tight text-[color:var(--pulp-orange)] italic">
                watched.
              </p>
            </motion.div>
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: stage >= 5 ? 1 : 0, y: stage >= 5 ? 0 : 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="mx-auto mt-8 max-w-2xl text-center text-[13px] font-bold tracking-[0.28em] text-[color:var(--pulp-cream)]/85 uppercase"
          >
            the short link{" "}
            <span className="text-[color:var(--pulp-yellow)]">/</span> that
            tells you <span className="text-[color:var(--pulp-yellow)]">/</span>{" "}
            when it breaks
          </motion.p>

          {/* Poster bottom — small directional nudge + sign-up CTA */}
          <motion.div
            initial={{ opacity: 0, y: HERO_FORM.y }}
            animate={{
              opacity: stage >= 6 ? 1 : 0,
              y: stage >= 6 ? 0 : HERO_FORM.y,
            }}
            transition={HERO_FORM.spring}
            className="mt-12 flex flex-col items-center gap-3"
          >
            <Link
              href="#features"
              className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] text-[color:var(--pulp-cream)]/70 uppercase hover:text-[color:var(--pulp-yellow)]"
            >
              ↓ see how it works
            </Link>
            <span className="text-[10px] font-bold tracking-[0.3em] text-[color:var(--pulp-cream)]/50 uppercase">
              100 free links · no credit card
            </span>
          </motion.div>
        </div>
      </section>

      {/* ───────── ACT I — The Shortener ───────── */}
      <ActOne
        url={url}
        setUrl={setUrl}
        handleShorten={handleShorten}
        submitting={submitting}
        formError={formError}
        yourLink={yourLink}
        copied={copied}
        copyShortLink={copyShortLink}
        urlLooksValid={urlLooksValid}
      />

      {/* ───────── ACT II — The Numbers ───────── */}
      <ActTwoBento />

      {/* ───────── ACT III — The Features (pillars) ───────── */}
      <PillarsSection />

      {/* ───────── INTERMISSION — The Incident (proof of Pillar I, before the verdict) ───────── */}
      <AlertEmailSection />

      {/* ───────── ACT IV — The Verdict ───────── */}
      <CompareSection />

      {/* ───────── THE FINAL CUT (CTA) ───────── */}
      <section className="paper-grain relative z-10 overflow-hidden border-t-4 border-[color:var(--pulp-ink)] bg-[color:var(--poster)] py-20 lg:py-28">
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-10 px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-3xl space-y-5">
            <h2 className="font-sigmar text-pulp text-5xl leading-[0.92] text-[color:var(--pulp-yellow)] italic md:text-7xl">
              Stop guessing.
              <br />
              <span className="text-[color:var(--pulp-orange)]">
                Start watching.
              </span>
            </h2>
            <p className="max-w-lg text-sm leading-7 text-[color:var(--pulp-cream)]/85">
              100 free links, one custom domain, and uptime monitoring on every
              link.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="h-14 gap-2 border-2 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-yellow)] px-8 text-sm font-bold tracking-[0.18em] text-[color:var(--pulp-ink)] uppercase shadow-[6px_6px_0_0_var(--pulp-ink)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[color:var(--pulp-yellow)] hover:text-[color:var(--pulp-ink)] hover:shadow-[3px_3px_0_0_var(--pulp-ink)]"
            >
              <Link href="/sign-up?redirect_url=/dashboard">
                Get started free
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
            <span className="text-[10px] font-bold tracking-[0.28em] text-[color:var(--pulp-cream)]/60 uppercase">
              no credit card · 60-second setup
            </span>
          </div>
        </div>
      </section>

      {/* ───────── END CREDITS (footer) ───────── */}
      <footer className="relative z-10 bg-[color:var(--pulp-ink)] text-[color:var(--pulp-cream)]/70">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="mb-10 flex items-end justify-between">
            <div className="space-y-2">
              {/* ndle wordmark — marquee bulb flickers on once when footer scrolls into view */}
              <FooterWordmark />
              <p className="text-[11px] font-bold tracking-[0.28em] uppercase opacity-60">
                short. sharp. smarter.
              </p>
            </div>
          </div>

          {/* Credits grid */}
          <div className="grid grid-cols-1 gap-8 border-t border-[color:var(--pulp-cream)]/15 pt-8 md:grid-cols-2 md:gap-10">
            <div className="space-y-2 text-[11px] font-bold tracking-[0.22em] uppercase">
              <Link
                href="#features"
                className="block opacity-80 hover:opacity-100"
              >
                Features
              </Link>
              <Link
                href="#compare"
                className="block opacity-80 hover:opacity-100"
              >
                Compare
              </Link>
              <Link
                href="/sign-up?redirect_url=/dashboard"
                className="block opacity-80 hover:opacity-100"
              >
                Get ndle
              </Link>
            </div>
            <div className="space-y-2 text-[11px] font-bold tracking-[0.22em] uppercase">
              <Link
                href="/sign-in?redirect_url=/dashboard"
                className="block opacity-80 hover:opacity-100"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up?redirect_url=/dashboard"
                className="block opacity-80 hover:opacity-100"
              >
                Sign up
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--pulp-cream)]/15 pt-6 text-[10px] font-semibold tracking-[0.28em] uppercase">
            <span className="opacity-50">© abhishek · ndle</span>
            <span className="flex items-center gap-3">
              {[
                { label: "X", href: "https://x.com/abhishk_084", Icon: DoodleX },
                {
                  label: "LinkedIn",
                  href: "https://www.linkedin.com/in/abhishek-ichi/",
                  Icon: DoodleLinkedIn,
                },
                { label: "GitHub", href: "https://github.com/imaxisXD", Icon: DoodleGitHub },
              ].map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abhishek on ${label}`}
                  title={label}
                  className="group inline-flex size-9 items-center justify-center rounded-sm border-2 border-[color:var(--pulp-cream)]/25 text-[color:var(--pulp-cream)]/70 transition-all hover:-rotate-3 hover:border-[color:var(--pulp-yellow)] hover:bg-[color:var(--pulp-yellow)] hover:text-[color:var(--pulp-ink)] hover:shadow-[3px_3px_0_0_var(--pulp-orange)] focus-visible:ring-2 focus-visible:ring-[color:var(--pulp-yellow)]/60 focus-visible:outline-none motion-reduce:hover:rotate-0"
                >
                  <Icon size={20} />
                </a>
              ))}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

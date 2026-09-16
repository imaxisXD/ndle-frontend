"use client";

/**
 * Landing v2 — THE LINK TERMINAL.
 *
 * Same pulp world as the brand home (Sigmar italic + text-pulp shadows,
 * poster blue / pulp cream scenes, 2px ink borders with hard offset shadows,
 * tracked-uppercase mono microcopy, stamps, paper grain) — but a new concept:
 * a railway terminal. The departures board is monitoring, the ticket window
 * is the real Convex-backed shortener, the boarding pass is your link, and
 * the service notice is the 03:04 incident.
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { ensureGuestSession, type GuestSession } from "@/lib/guest";
import { makeShortLink } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { NdleDotMatrix } from "@/components/ndle-dot-matrix";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRightIcon, CheckIcon, CopyIcon } from "@phosphor-icons/react";

/* ───────── palette shorthands (globals.css scene tokens) ───────── */

const INK = "var(--pulp-ink)";
const CREAM = "var(--pulp-cream)";
const YELLOW = "var(--pulp-yellow)";
const ORANGE = "var(--pulp-orange)";

const wordmarkOnBlue = { on: "var(--pulp-cream)", off: "oklch(0.42 0.22 268)" };
const wordmarkOnInk = { on: "var(--pulp-yellow)", off: "oklch(0.3 0.06 320)" };

type YourLink = { slug: string; original: string } | null;

/* ───────── shared atoms ───────── */

function Kicker({ chip, label, light }: { chip: string; label: string; light?: boolean }) {
  return (
    <div
      className={`mb-4 flex items-center gap-3 ${
        light ? "text-[color:var(--pulp-cream)]" : "text-[color:var(--pulp-ink)]"
      }`}
    >
      <span className="inline-flex h-7 items-center border border-current px-2 text-[10px] font-bold tracking-[0.3em] uppercase">
        {chip}
      </span>
      <span className="text-[11px] font-bold tracking-[0.3em] uppercase opacity-80">{label}</span>
    </div>
  );
}

/* ───────── hero stamps ───────── */

function RoundelStamp() {
  return (
    <div
      className="flex size-20 flex-col items-center justify-center rounded-full border-2 text-center"
      style={{ borderColor: INK, color: INK, backgroundColor: "color-mix(in oklab, var(--pulp-cream) 95%, transparent)" }}
    >
      <span className="font-sigmar text-xl leading-none italic">N</span>
      <span className="mt-1 text-[7px] font-bold tracking-[0.18em] uppercase">terminal</span>
      <span className="text-[7px] font-bold tracking-[0.18em] uppercase">est. 2026</span>
    </div>
  );
}

function TimetableStamp() {
  return (
    <div
      className="inline-flex flex-col items-end gap-1 px-3 py-2"
      style={{ color: INK, backgroundColor: "color-mix(in oklab, var(--pulp-cream) 95%, transparent)" }}
    >
      <span className="text-[9px] font-bold tracking-[0.22em] uppercase">timetable</span>
      <span
        className="flex items-center justify-center border px-3 py-1 text-[9px] font-bold tracking-[0.25em] uppercase"
        style={{ borderColor: INK, borderRadius: "50% / 60%" }}
      >
        every 60s
      </span>
      <span className="text-right text-[8px] font-semibold tracking-[0.2em] uppercase">
        4 regions · all lines
      </span>
    </div>
  );
}

/* ───────── split-flap marquee ───────── */

function FlapLine({
  text,
  play,
  reduce,
  delay = 0,
}: {
  text: string;
  play: boolean;
  reduce: boolean | null;
  delay?: number;
}) {
  const chars = text.split("");
  return (
    <div aria-label={text} role="img" className="flex flex-wrap justify-center gap-1">
      {chars.map((ch, i) =>
        ch === " " ? (
          <span key={i} aria-hidden className="w-3 sm:w-4" />
        ) : (
          <motion.span
            key={i}
            aria-hidden
            initial={reduce ? false : { rotateX: -90, opacity: 0 }}
            animate={play ? { rotateX: 0, opacity: 1 } : undefined}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 26,
              delay: reduce ? 0 : delay + i * 0.04,
            }}
            style={{ transformPerspective: 500 }}
            className="font-doto relative flex h-8 w-6 items-center justify-center overflow-hidden rounded-[3px] bg-[oklch(0.22_0.012_85)] text-sm font-black text-[color:var(--pulp-yellow)] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] sm:h-9 sm:w-7 sm:text-base after:absolute after:inset-x-0 after:top-1/2 after:h-px after:bg-black/50"
          >
            {ch}
          </motion.span>
        ),
      )}
    </div>
  );
}

/* ───────── the departures board ───────── */

type BoardStatus = "UP" | "SLOW" | "DOWN";

const BOARD: Array<{ slug: string; dest: string; last: string; status: BoardStatus }> = [
  { slug: "ndle.im/launch", dest: "mysite.com/product-launch", last: "12s", status: "UP" },
  { slug: "ndle.im/docs", dest: "docs.mycompany.com/start", last: "18s", status: "UP" },
  { slug: "ndle.im/blog", dest: "blog.mycompany.com/latest", last: "07s", status: "SLOW" },
  { slug: "ndle.im/careers", dest: "mysite.com/senior-engineer", last: "03s", status: "DOWN" },
  { slug: "ndle.im/pricing", dest: "mysite.com/pricing", last: "22s", status: "UP" },
];

function boardStatusColor(s: BoardStatus) {
  switch (s) {
    case "UP":
      return "text-[oklch(0.78_0.19_145)]";
    case "SLOW":
      return "text-[color:var(--pulp-orange)]";
    case "DOWN":
      return "text-[oklch(0.68_0.22_25)]";
  }
}

function StationClock({ reduce }: { reduce: boolean | null }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [reduce]);
  const total = 2 + tick;
  const mm = (14 + Math.floor(total / 60)).toString().padStart(2, "0");
  const ss = (total % 60).toString().padStart(2, "0");
  return (
    <span className="font-doto roundness-100 text-base font-black tracking-[0.08em] text-[color:var(--pulp-yellow)] tabular-nums">
      08:{mm}:{ss}
    </span>
  );
}

function DeparturesBoard({ inView, reduce }: { inView: boolean; reduce: boolean | null }) {
  const COLS =
    "grid grid-cols-[minmax(0,1fr)_5rem_4.5rem] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_4rem_5rem] items-center gap-3 sm:gap-4";

  return (
    <div
      className="overflow-hidden rounded-lg border-2 shadow-[8px_8px_0_0_var(--pulp-orange)]"
      style={{ borderColor: INK, backgroundColor: "oklch(0.18 0.012 85)" }}
    >
      {/* board header — station clock + line name */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
        <span className="flex items-center gap-2.5 text-[10px] font-bold tracking-[0.3em] text-[color:var(--pulp-cream)]/80 uppercase">
          <span className="animate-live-blip inline-block size-1.5 rounded-full bg-[color:var(--pulp-yellow)]" />
          departures · all lines
        </span>
        <StationClock reduce={reduce} />
      </div>

      {/* split-flap message row */}
      <div className="border-b border-white/10 px-4 py-4">
        <FlapLine text="ALL LINKS WATCHED" play={inView} reduce={reduce} delay={0.15} />
      </div>

      {/* column headers */}
      <div
        className={`${COLS} px-5 py-2 text-[9px] font-bold tracking-[0.22em] text-[color:var(--pulp-cream)]/45 uppercase`}
      >
        <span>link</span>
        <span className="hidden sm:block">destination</span>
        <span className="text-right">checked</span>
        <span className="text-right">status</span>
      </div>

      {/* rows */}
      <ul className="divide-y divide-white/8">
        {BOARD.map((r, i) => {
          const down = r.status === "DOWN";
          return (
            <motion.li
              key={r.slug}
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={inView ? { opacity: 1, x: 0 } : undefined}
              transition={{ duration: 0.25, delay: reduce ? 0 : 0.7 + i * 0.08 }}
              className={`${COLS} px-5 py-2.5 font-mono text-[12px] leading-none ${
                down ? "bg-[oklch(0.55_0.22_25)]/12" : ""
              }`}
            >
              <span className="truncate text-[color:var(--pulp-cream)]">
                <span className="opacity-50">ndle.im/</span>
                <span className="font-bold">{r.slug.split("/")[1]}</span>
              </span>
              <span className="hidden truncate text-[color:var(--pulp-cream)]/55 sm:block">
                {r.dest}
              </span>
              <span className="text-right text-[color:var(--pulp-cream)]/55 tabular-nums">
                {r.last}
              </span>
              <span
                className={`font-doto text-right text-[13px] font-black tracking-[0.1em] ${boardStatusColor(r.status)} ${
                  down ? "animate-live-blip" : ""
                }`}
              >
                {r.status}
              </span>
            </motion.li>
          );
        })}
      </ul>

      {/* board footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-5 py-2.5 text-[9px] font-bold tracking-[0.2em] text-[color:var(--pulp-cream)]/45 uppercase">
        <span>us-east · eu-west · ap-south · sa-east</span>
        <span>demo board — your links get the same eyes</span>
      </div>
    </div>
  );
}

/* ───────── hero — the terminal hall ───────── */

function Hero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const rise = (delay: number) => ({
    initial: reduce ? false : ({ opacity: 0, y: 14, scale: 0.97 } as const),
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring" as const, stiffness: 300, damping: 28, delay: reduce ? 0 : delay },
  });

  return (
    <section
      className="paper-grain relative overflow-hidden border-b-4"
      style={{ backgroundColor: "var(--poster)", borderColor: INK }}
    >
      {/* nav */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <Link href="/" aria-label="ndle home" className="flex items-center gap-3">
            <NdleDotMatrix rows={7} cols={18} size={3.5} gap={1.5} palette={wordmarkOnBlue} />
            <span className="hidden text-[10px] font-bold tracking-[0.3em] text-[color:var(--pulp-cream)]/70 uppercase sm:inline">
              / the link terminal
            </span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-[color:var(--pulp-cream)] hover:bg-[color:var(--pulp-cream)]/10 hover:text-[color:var(--pulp-cream)]"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-[color:var(--pulp-yellow)] text-[color:var(--pulp-ink)] hover:bg-[color:var(--pulp-yellow)]/90"
            >
              <Link href="/sign-up">
                Get ndle
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <div ref={ref} className="relative mx-auto max-w-7xl px-5 pt-8 pb-16 lg:px-8 lg:pt-10 lg:pb-24">
        {/* stamp ribbon */}
        <div className="mb-10 grid grid-cols-3 items-start gap-4">
          <motion.div className="justify-self-start" {...rise(0.05)}>
            <RoundelStamp />
          </motion.div>
          <motion.p
            className="self-center justify-self-center text-center text-[11px] font-bold tracking-[0.42em] text-[color:var(--pulp-cream)] uppercase"
            {...rise(0.14)}
          >
            the{" "}
            <span className="font-sigmar text-[15px] tracking-normal text-[color:var(--pulp-yellow)] italic">
              ndle
            </span>{" "}
            railway co.
          </motion.p>
          <motion.div className="justify-self-end" {...rise(0.1)}>
            <TimetableStamp />
          </motion.div>
        </div>

        {/* title */}
        <h1 className="py-4 text-center md:py-6">
          <motion.span
            className="font-sigmar text-pulp block text-[clamp(2.5rem,7.5vw,4.75rem)] leading-[0.92] text-[color:var(--pulp-yellow)] italic"
            {...rise(0.24)}
          >
            Every link,
          </motion.span>
          <motion.span
            className="font-sigmar text-pulp -mt-1 block text-[clamp(3.75rem,13vw,9.5rem)] leading-[0.88] tracking-tight text-[color:var(--pulp-orange)] italic md:-mt-3"
            {...rise(0.38)}
          >
            watched.
          </motion.span>
        </h1>

        {/* subtitle */}
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-center text-[12px] font-bold tracking-[0.28em] text-[color:var(--pulp-cream)]/85 uppercase sm:text-[13px]"
          {...rise(0.55)}
        >
          checked every 60 seconds <span className="text-[color:var(--pulp-yellow)]">/</span> from
          4 regions <span className="text-[color:var(--pulp-yellow)]">/</span> alerts before
          passengers notice
        </motion.p>

        {/* the departures board */}
        <motion.div className="mx-auto mt-12 max-w-4xl" {...rise(0.7)}>
          <DeparturesBoard inView={inView} reduce={reduce} />
        </motion.div>

        <motion.div className="mt-10 text-center" {...rise(0.85)}>
          <a
            href="#ticket-window"
            className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] text-[color:var(--pulp-cream)]/70 uppercase transition-colors hover:text-[color:var(--pulp-yellow)]"
          >
            ↓ the ticket window is open
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────── boarding pass ───────── */

function BoardingPass({
  yourLink,
  copied,
  onCopy,
}: {
  yourLink: YourLink;
  copied: boolean;
  onCopy: () => void;
}) {
  const isSample = !yourLink;
  const slug = yourLink?.slug ?? "ndle.im/x7f2a9";
  const original = yourLink?.original ?? "yoursite.com/campaigns/spring-launch";

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ rotate: 0.8 }}
        animate={yourLink ? { rotate: [0.8, -0.6, 0.8] } : undefined}
        transition={{ duration: 0.5 }}
        className="relative grid grid-cols-[minmax(0,1.6fr)_auto] overflow-hidden rounded-lg border-2 bg-white shadow-[6px_6px_0_0_var(--pulp-ink)]"
        style={{ borderColor: INK, color: INK }}
      >
        {/* main panel */}
        <div className="min-w-0 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 text-[9px] font-bold tracking-[0.25em] uppercase opacity-60">
            <span>ndle terminal · boarding pass</span>
            <span>fare $0</span>
          </div>

          <div className="mt-5 space-y-1">
            <p className="text-[9px] font-bold tracking-[0.22em] uppercase opacity-55">from</p>
            <p className="truncate font-mono text-[13px] opacity-75">{original}</p>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-[9px] font-bold tracking-[0.22em] uppercase opacity-55">to</p>
            <p className="font-sigmar truncate text-2xl leading-tight italic sm:text-3xl">
              <span className="opacity-45">ndle.im/</span>
              <span className="text-[color:var(--pulp-orange)]">{slug.split("/")[1]}</span>
            </p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold tracking-[0.16em] uppercase sm:grid-cols-4">
            {[
              ["service", "60s checks"],
              ["regions", "4 of 4"],
              ["carriage", "analytics"],
              ["seat", "qr"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="opacity-50">{k}</dt>
                <dd className="mt-0.5">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* stub */}
        <div
          className="relative flex flex-col items-center justify-between gap-3 border-l-2 border-dashed p-4"
          style={{ borderColor: INK }}
        >
          {/* punch-hole notches — filled with the scene's cream so they read as cutouts */}
          <span
            aria-hidden
            className="absolute -top-2.5 -left-[9px] size-4 rounded-full border-2"
            style={{ backgroundColor: CREAM, borderColor: INK }}
          />
          <span
            aria-hidden
            className="absolute -bottom-2.5 -left-[9px] size-4 rounded-full border-2"
            style={{ backgroundColor: CREAM, borderColor: INK }}
          />
          <span className="text-[8px] font-bold tracking-[0.3em] uppercase opacity-55">
            admit one
          </span>
          <QRCodeSVG value={`https://${slug}`} size={84} bgColor="transparent" fgColor="var(--pulp-ink)" />
          <span className="max-w-[84px] truncate font-mono text-[9px] opacity-60">{slug}</span>
        </div>

        {/* SPECIMEN watermark on the sample pass */}
        {isSample && (
          <span
            aria-hidden
            className="font-sigmar pointer-events-none absolute inset-0 flex items-center justify-center text-5xl italic opacity-[0.09] select-none"
            style={{ transform: "rotate(-14deg)", color: INK }}
          >
            SPECIMEN
          </span>
        )}

        {/* WATCHED stamp slams on when the pass is real */}
        {yourLink && (
          <motion.span
            aria-hidden
            className="font-sigmar pointer-events-none absolute top-3 right-24 z-10 border-[3px] px-2 py-0.5 text-base italic select-none"
            style={{ borderColor: ORANGE, color: ORANGE, backgroundColor: "white", letterSpacing: "0.1em" }}
            initial={{ scale: 1.9, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 0.95, rotate: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 15, delay: 0.15 }}
          >
            WATCHED
          </motion.span>
        )}
      </motion.div>

      {yourLink ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-1.5 rounded-sm border-2 bg-white px-3 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-colors hover:bg-[color:var(--pulp-ink)] hover:text-[color:var(--pulp-yellow)] focus-visible:ring-2 focus-visible:ring-[color:var(--pulp-orange)] focus-visible:outline-none"
            style={{ borderColor: INK, color: undefined }}
            aria-live="polite"
          >
            {copied ? (
              <>
                <CheckIcon weight="bold" className="size-3" /> clipped
              </>
            ) : (
              <>
                <CopyIcon weight="bold" className="size-3" /> copy link
              </>
            )}
          </button>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-1.5 rounded-sm border-2 bg-[color:var(--pulp-yellow)] px-3 py-2 text-[10px] font-bold tracking-[0.2em] uppercase transition-transform active:translate-x-px active:translate-y-px"
            style={{ borderColor: INK, color: INK }}
          >
            keep it forever
            <ArrowRightIcon weight="bold" className="size-3" />
          </Link>
        </div>
      ) : (
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase opacity-55" style={{ color: INK }}>
          ● specimen shown — shorten a link and this pass becomes yours
        </p>
      )}
    </div>
  );
}

/* ───────── scene: the ticket window ───────── */

function TicketWindow({
  url,
  setUrl,
  handleShorten,
  submitting,
  formError,
  urlLooksValid,
  yourLink,
  copied,
  onCopy,
}: {
  url: string;
  setUrl: (s: string) => void;
  handleShorten: (e: React.FormEvent) => void;
  submitting: boolean;
  formError: string | null;
  urlLooksValid: boolean;
  yourLink: YourLink;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <section
      id="ticket-window"
      className="relative scroll-mt-6 border-b-4 py-20 lg:py-24"
      style={{ backgroundColor: CREAM, borderColor: INK }}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8">
        <div>
          <Kicker chip="ticket window" label="no ticket required" />
          <h2 className="font-sigmar text-pulp-sm text-5xl leading-[0.95] text-[color:var(--pulp-orange)] italic md:text-6xl">
            Shorten one.
            <br />
            Ride free.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7" style={{ color: `color-mix(in oklab, ${INK} 80%, transparent)` }}>
            Paste a long URL. We stamp it into a short one, put it on the watch rota — checked
            every 60 seconds from four regions — and hand you the boarding pass.
          </p>

          <form
            onSubmit={handleShorten}
            className="mt-7 flex w-full items-stretch overflow-hidden rounded-md border-2 bg-white shadow-[4px_4px_0_0_var(--pulp-ink)] transition-shadow focus-within:shadow-[6px_6px_0_0_var(--pulp-orange)]"
            style={{ borderColor: INK }}
            aria-invalid={formError ? true : undefined}
          >
            <span
              aria-hidden
              className={`flex w-9 items-center justify-center text-sm font-bold ${
                urlLooksValid ? "text-[oklch(0.5_0.18_145)]" : "opacity-40"
              }`}
              style={{ color: urlLooksValid ? undefined : INK }}
            >
              {urlLooksValid ? "✓" : "▸"}
            </span>
            <label htmlFor="lv2-url" className="sr-only">
              Long link to shorten
            </label>
            <input
              id="lv2-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="paste a long url to shorten"
              disabled={submitting}
              inputMode="url"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-3.5 pr-3 text-sm outline-none placeholder:opacity-40"
              style={{ color: INK }}
            />
            <button
              type="submit"
              disabled={submitting}
              className="flex shrink-0 items-center gap-1.5 border-l-2 bg-[color:var(--pulp-orange)] px-5 text-xs font-bold tracking-[0.18em] text-[color:var(--pulp-cream)] uppercase transition-transform active:translate-x-px active:translate-y-px disabled:opacity-80"
              style={{ borderColor: INK }}
            >
              {submitting ? "stamping…" : "stamp it"}
              {submitting ? (
                <span
                  aria-hidden
                  className="inline-block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:hidden"
                />
              ) : (
                <ArrowRightIcon className="size-3.5" />
              )}
            </button>
          </form>

          {formError && (
            <p
              role="alert"
              className="mt-3 text-[11px] font-bold tracking-[0.2em] text-[oklch(0.55_0.22_25)] uppercase"
            >
              ● {formError}
            </p>
          )}

          <div
            className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: `color-mix(in oklab, ${INK} 60%, transparent)` }}
          >
            {["no credit card", "100 free links", "guest passes ride 7 days"].map((label) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <CheckIcon className="size-3 text-[color:var(--pulp-orange)]" /> {label}
              </span>
            ))}
          </div>
        </div>

        <BoardingPass yourLink={yourLink} copied={copied} onCopy={onCopy} />
      </div>
    </section>
  );
}

/* ───────── scene: wayfinding (the three platforms) ───────── */

const PLATFORMS = [
  {
    no: "platform i",
    title: "Watched, every 60 seconds.",
    body: "Four regions ping every destination on the clock. SSL death, 503s, redirects gone weird — a dispatch goes out before a single passenger notices.",
  },
  {
    no: "platform ii",
    title: "Ask the conductor.",
    body: "“Which campaign spiked Friday?” Answered with a chart drawn from your real clicks. Analytics you can question, not a dashboard you decode.",
  },
  {
    no: "platform iii",
    title: "Your name on the line.",
    body: "Bring links.yourbrand.com — the first domain rides free. And every ticket prints with a tracked QR code.",
  },
];

function Wayfinding() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();

  return (
    <section
      ref={ref}
      className="paper-grain relative overflow-hidden border-b-4 py-20 lg:py-24"
      style={{ backgroundColor: "var(--poster)", borderColor: INK }}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-12 max-w-3xl">
          <Kicker chip="wayfinding" label="three platforms, one watchdog" light />
          <h2 className="font-sigmar text-pulp-sm text-5xl leading-[0.95] text-[color:var(--pulp-yellow)] italic md:text-7xl">
            More than
            <br />a shortener.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PLATFORMS.map((p, i) => (
            <motion.article
              key={p.no}
              className="flex flex-col rounded-lg border-2 p-7 shadow-[5px_5px_0_0_var(--pulp-ink)]"
              style={{ backgroundColor: CREAM, borderColor: INK, color: INK }}
              initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
              animate={inView ? { opacity: 1, y: 0, scale: 1 } : undefined}
              transition={{ type: "spring", stiffness: 320, damping: 28, delay: reduce ? 0 : 0.15 + i * 0.12 }}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="inline-flex h-7 items-center border border-current px-2 text-[10px] font-bold tracking-[0.3em] uppercase">
                  {p.no}
                </span>
                <span aria-hidden className="font-sigmar text-2xl leading-none text-[color:var(--pulp-orange)] italic">
                  →
                </span>
              </div>
              <h3 className="font-sigmar text-2xl leading-tight italic md:text-[1.6rem]">{p.title}</h3>
              <p className="mt-4 text-sm leading-6 opacity-80">{p.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── scene: the service notice (the incident) ───────── */

const NOTICE_LINES = [
  { t: "03:04:03", text: "ndle.im/careers — 503 at sa-east", tone: "down" as const },
  { t: "03:04:04", text: "dispatch sent → you", tone: "alert" as const },
  { t: "03:04:41", text: "service resumed — 200 OK", tone: "ok" as const },
];

function ServiceNotice() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const reduce = useReducedMotion();

  return (
    <section
      ref={ref}
      className="paper-grain relative overflow-hidden border-b-4 py-20 lg:py-24"
      style={{ backgroundColor: YELLOW, borderColor: INK }}
    >
      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8">
        <div style={{ color: INK }}>
          <Kicker chip="service notice" label="a scene from 03:04 am" />
          <h2 className="font-sigmar text-pulp-sm text-5xl leading-[0.95] italic md:text-7xl">
            You hear it
            <br />
            first.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-7 opacity-80">
            A dead link is a campaign dying quietly. Here&apos;s a whole incident as the station
            logged it — 38 seconds start to finish, zero passengers lost.
          </p>
        </div>

        {/* the station logbook */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, rotate: 0 }}
          animate={inView ? { opacity: 1, y: 0, rotate: -0.6 } : undefined}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="relative overflow-hidden rounded-lg border-2 bg-white shadow-[6px_6px_0_0_var(--pulp-ink)]"
          style={{ borderColor: INK, color: INK }}
        >
          <div className="flex items-center justify-between border-b-2 px-6 py-3.5" style={{ borderColor: INK }}>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase opacity-60">
              station logbook · incident 0304-a
            </span>
            <span className="text-[9px] font-bold tracking-[0.3em] uppercase opacity-60">
              night shift
            </span>
          </div>

          <ul className="px-6 py-5 font-mono text-[13px] leading-relaxed">
            {NOTICE_LINES.map((l, i) => (
              <motion.li
                key={l.t}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={inView ? { opacity: 1, x: 0 } : undefined}
                transition={{ duration: 0.25, delay: reduce ? 0 : 0.4 + i * 0.35 }}
                className={`flex items-baseline gap-4 py-2 ${
                  l.tone === "alert" ? "bg-[color:var(--pulp-yellow)]/45 -mx-2 rounded-sm px-2 font-bold" : ""
                }`}
              >
                <span className="shrink-0 opacity-50 tabular-nums">{l.t}</span>
                <span className="min-w-0">
                  {l.tone === "alert" && <span aria-hidden>⚑ </span>}
                  {l.text}
                </span>
                <span
                  aria-hidden
                  className={`ml-auto shrink-0 ${
                    l.tone === "down"
                      ? "text-[oklch(0.55_0.22_25)]"
                      : l.tone === "ok"
                        ? "text-[oklch(0.5_0.18_145)]"
                        : "text-[color:var(--pulp-orange)]"
                  }`}
                >
                  ●
                </span>
              </motion.li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t px-6 py-3 text-[9px] font-bold tracking-[0.25em] uppercase opacity-60" style={{ borderColor: `color-mix(in oklab, ${INK} 30%, transparent)` }}>
            <span>passengers affected: 0</span>
            <span>filed by: the watchdog</span>
          </div>

          {/* RESUMED stamp */}
          <motion.span
            aria-hidden
            className="font-sigmar pointer-events-none absolute top-4 right-5 border-[3px] px-2.5 py-0.5 text-lg italic select-none"
            style={{ borderColor: "oklch(0.5 0.18 145)", color: "oklch(0.5 0.18 145)", letterSpacing: "0.1em" }}
            initial={reduce ? false : { opacity: 0, scale: 1.9, rotate: -45 }}
            animate={inView ? { opacity: 0.85, scale: 1, rotate: 9 } : undefined}
            transition={{ type: "spring", stiffness: 280, damping: 13, delay: reduce ? 0 : 1.6 }}
          >
            RESUMED
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
}

/* ───────── scene: last call (CTA) ───────── */

function LastCall() {
  return (
    <section
      className="paper-grain relative overflow-hidden py-20 lg:py-28"
      style={{ backgroundColor: "var(--poster)" }}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-5 text-center lg:px-8">
        <p className="text-[11px] font-bold tracking-[0.42em] text-[color:var(--pulp-cream)]/80 uppercase">
          ⚑ last call · all aboard
        </p>
        <h2 className="font-sigmar text-pulp mt-6 text-5xl leading-[0.92] text-[color:var(--pulp-yellow)] italic md:text-7xl">
          Next departure:
          <br />
          <span className="text-[color:var(--pulp-orange)]">now.</span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-[11px] font-bold tracking-[0.28em] text-[color:var(--pulp-cream)]/70 uppercase">
          100 free links · one custom domain · monitoring included · no card
        </p>
        <div className="mt-10 flex flex-col items-center gap-4">
          <Button
            asChild
            size="lg"
            className="h-14 gap-2 border-2 bg-[color:var(--pulp-yellow)] px-8 text-sm font-bold tracking-[0.18em] text-[color:var(--pulp-ink)] uppercase shadow-[6px_6px_0_0_var(--pulp-ink)] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:bg-[color:var(--pulp-yellow)] hover:text-[color:var(--pulp-ink)] hover:shadow-[3px_3px_0_0_var(--pulp-ink)]"
            style={{ borderColor: INK }}
          >
            <Link href="/sign-up">
              board free
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
          <Link
            href="/sign-in"
            className="text-[10px] font-bold tracking-[0.3em] text-[color:var(--pulp-cream)]/60 uppercase underline underline-offset-4 transition-colors hover:text-[color:var(--pulp-yellow)]"
          >
            already holding a ticket? sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────── footer ───────── */

function TerminalFooter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <footer className="border-t-4" style={{ backgroundColor: INK, borderColor: INK }}>
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div ref={ref} className="space-y-2">
            <div className={inView ? "animate-bulb-switch" : "opacity-20"}>
              <NdleDotMatrix rows={7} cols={22} size={4} gap={1.5} palette={wordmarkOnInk} />
            </div>
            <p className="text-[11px] font-bold tracking-[0.28em] text-[color:var(--pulp-cream)]/60 uppercase">
              short. sharp. smarter.
            </p>
          </div>
          <span className="font-sigmar text-xl text-[color:var(--pulp-yellow)] italic md:text-2xl">
            all clear on the line.
          </span>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--pulp-cream)]/15 pt-6 text-[10px] font-bold tracking-[0.25em] text-[color:var(--pulp-cream)]/55 uppercase">
          <span className="flex items-center gap-4">
            <Link href="/sign-in" className="transition-opacity hover:opacity-100">
              Sign in
            </Link>
            <Link href="/sign-up" className="transition-opacity hover:opacity-100">
              Sign up
            </Link>
          </span>
          <span className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-[oklch(0.72_0.18_145)]" />
            all systems nominal · © 2026 ndle
          </span>
        </div>
      </div>
    </footer>
  );
}

/* ───────── page ───────── */

export function LandingV2() {
  const [url, setUrl] = useState("");
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [yourLink, setYourLink] = useState<YourLink>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createGuestUrl = useMutation(api.urlMainFuction.createGuestUrl);

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
      .then((s) => !cancelled && setGuestSession(s))
      .catch(() => {
        /* retried lazily on submit */
      });
    return () => {
      cancelled = true;
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const trimmed = url.trim();
    if (!trimmed) {
      setFormError("paste a url first.");
      return;
    }
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      const parsed = new URL(normalized);
      if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes(".")) {
        throw new Error("bad url");
      }
    } catch {
      setFormError("that doesn't look like a valid url.");
      return;
    }

    setSubmitting(true);
    try {
      let session = guestSession;
      if (!session) {
        session = await ensureGuestSession();
        setGuestSession(session);
      }
      const result = await createGuestUrl({
        url: normalized,
        guestId: session.guestId,
        guestToken: session.guestToken,
      });
      setYourLink({
        slug: makeShortLink(result.slug),
        original: normalized.replace(/^https?:\/\//i, ""),
      });
      setUrl("");
    } catch (err) {
      if (err instanceof ConvexError) {
        setFormError(typeof err.data === "string" ? err.data : "couldn't shorten that link.");
      } else {
        setFormError("couldn't shorten that link — try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyShortLink = async () => {
    if (!yourLink) return;
    try {
      await navigator.clipboard.writeText(`https://${yourLink.slug}`);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      setFormError("copy was blocked — grab the link off the pass.");
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-clip font-mono selection:bg-[color:var(--pulp-yellow)] selection:text-[color:var(--pulp-ink)]">
      <Hero />
      <TicketWindow
        url={url}
        setUrl={setUrl}
        handleShorten={handleShorten}
        submitting={submitting}
        formError={formError}
        urlLooksValid={urlLooksValid}
        yourLink={yourLink}
        copied={copied}
        onCopy={copyShortLink}
      />
      <Wayfinding />
      <ServiceNotice />
      <LastCall />
      <TerminalFooter />
    </div>
  );
}

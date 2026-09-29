"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation } from "convex/react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  ArrowsOutSimpleIcon,
  ArrowSquareOutIcon,
  CheckIcon,
  CircleNotchIcon,
  CopyIcon,
  GlobeSimpleIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ui/badge";
import { api } from "@/convex/_generated/api";
import { useFavicon } from "@/hooks/use-favicon";
import { ensureGuestSession, type GuestSession } from "@/lib/guest";
import { makeShortLink } from "@/lib/config";
import { cn } from "@/lib/utils";
import { FOCUS } from "./kit";
import { PROBLEMS, ShortenProblem, problemFor, type Problem } from "./shorten-problems";
import type { MadeLink, YourLink } from "./your-link-pages";

/* The hero's shortener. ndle shortens the link in front of you: the long
   link you pasted is taken in at a caret, character by character, and what's
   left rolls over into the short link, in the same field. When it can't,
   the field tries to take the link in, jams, and gives it back, and the
   red alert LED from the rest of the page says why.

   The field's font is monospace, so every character is one 1ch box: the
   strip of characters drawn over the field lines up with the text in it
   exactly, and the link visibly gets shorter by one box at a time. */

/* ─────────────────────────────────────────────────────────
 * SHORTENED   (ms after the link comes back from the server)
 *
 *     0ms   the long link freezes into a strip of characters; an amber
 *           caret drops in where the short link will end (after 15)
 *    90ms   the rest feeds in at the caret, one character after another,
 *           ≤9ms apart and never more than 520ms in all; the count at the
 *           field's end runs with it: −1 … −75 chars
 *  ~660ms   nearly fed; the caret goes, and the characters left roll over
 *           into the short link, left to right (22ms apart)
 * ~1290ms   landed: the field is tinted Signal Yellow like a just-made
 *           row in the dashboard, then settles; the check replaces the
 *           link icon; Shortening… turns into Copy link
 *
 *   Times are for a 90-character link. The roll starts as the feed ends,
 *   so a shorter link lands sooner.
 *
 * THEN   (ms after it lands) the field opens into the link's card, the way
 *        the link will look in the dashboard
 *
 *   120ms   a dashed rule draws across under the short link and a row
 *           opens beneath it; See it in ndle (or, without the pass,
 *           Shorten another) opens under Copy link, in step, so the card
 *           and the buttons stay one block
 *   260ms   the long link comes back out on that row as the link's record:
 *           its site's icon, then where it goes
 *   400ms   a "not watched" badge settles in at the row's end, its LED
 *           unlit. Pointing at "Sign up free" lights it: watched
 *   520ms   the note rises in under it all
 *
 *   All of this plays behind the dashboard pass (your-link-takeover.tsx),
 *   which opens as soon as the server has made the link, never for one it
 *   refused; the card is what's left on the page once the visitor goes
 *   back to it. See it in ndle plays the pass again
 *
 * JAMMED   (ms after the link is refused, here or by the server)
 *
 *     0ms   the link squeezes toward the start of the field, its letters
 *           bunching up, as if the field were taking it in
 *   150ms   jammed: it springs back out a touch past where it was; the
 *           link icon turns into the red alert LED, which pings once; the
 *           field's border goes red and a faint red light passes over it
 *   200ms   the reason rises in under the field
 *   620ms   settled: the field is editable, exactly as it was
 *
 * Reduced motion skips both passes and shows where they end.
 * ───────────────────────────────────────────────────────── */

const FEED = {
  at: 90, // ms: the tail starts feeding in at the caret
  span: 520, // ms: the whole tail feeds in within this, however long it is
  every: 9, // ms: at most this between two characters
  each: 0.12, // s: one character folding away into the caret
  blur: "blur(3px)", // how a character blurs as it goes
  maxChars: 160, // characters drawn; the field has run out long before this
};

const ROLL = {
  overlap: 60, // ms: the roll starts this long before the feed has finished
  every: 0.022, // s between two characters rolling over, left to right
  settle: 320, // ms after the last one starts, when it has landed
  spring: { type: "spring" as const, stiffness: 520, damping: 34 },
};

const CARET = {
  color: "oklch(0.78 0.16 80)", // amber: Signal Yellow, deep enough to see on white
  spring: { type: "spring" as const, stiffness: 600, damping: 30 },
};

const JAM = {
  jammed: 150, // ms: squeezed tightest; the LED lights and the border goes red
  message: 200, // ms: the reason rises in
  release: 620, // ms: the strip goes and the field is as it was
  spacing: ["0em", "-0.3em", "0.05em", "-0.01em", "0em"], // letter-spacing over the jam
  times: [0, 0.24, 0.55, 0.8, 1],
  duration: 0.6, // s
};

const FINALE = {
  unfold: 120, // ms after landing: the card's second row and Shorten another open
  record: 260, // the long link comes back out as the link's record
  badge: 400, // the not-watched badge settles in
  note: 520, // the note rises in
};

const UNLIT = "#cbc9c2"; // the page's LED before it lights

/* The link icon, the alert LED and the check swap in place. */
const MARK = {
  spring: { type: "spring" as const, stiffness: 500, damping: 26 },
  from: 0.4,
};

/* The button's label swaps up and out. */
const LABEL = {
  offset: 8,
  spring: { type: "spring" as const, stiffness: 520, damping: 34 },
};

const COPIED_FOR = 1600; // ms "Copied" stays on the button

const RED = "#f13936"; // oklch(0.63 0.22 27), the page's alert LED

const PLACEHOLDER = "Paste your long link here…";
const SIGN_UP = "/sign-up?redirect_url=/dashboard";

/** What the field showed when it was sent: the text, or the placeholder
    when empty, how far the field had scrolled along it, and how many
    whole characters that scrolled out of sight. */
type Shown = {
  text: string;
  placeholder: boolean;
  scroll: number;
  hidden: number;
};

type Outcome =
  | { kind: "idle" }
  | {
      kind: "done";
      id: number;
      shown: Shown;
      short: string;
      destination: string;
      expiresAt: number;
    }
  | { kind: "error"; id: number; shown: Shown; problem: Problem };

/* Stages, reset for each outcome. Shortened: 0 frozen, 1 feeding, 2 rolling,
   3 landed. Jammed: 0 squeezing, 1 jammed, 2 settled. */
const LANDED = 3;
const SETTLED = 2;

const IDLE: Outcome = { kind: "idle" };

function delay(ms: number) {
  return { "--h2-delay": `${ms}ms` } as CSSProperties;
}

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!/^https?:$/.test(parsed.protocol) || !parsed.hostname.includes(".")) return null;
    return candidate;
  } catch {
    return null;
  }
}

/** How many whole characters of the field's monospace text are scrolled
    out of sight at its left edge. */
function hiddenChars(input: HTMLInputElement | null) {
  if (!input?.scrollLeft) return 0;
  const style = getComputedStyle(input);
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return 0;
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const ch = context.measureText("0").width;
  return ch > 0 ? Math.floor(input.scrollLeft / ch) : 0;
}

/** When the shortened pass's beats land, from how much there is to take in. */
function schedule(shown: Shown, short: string) {
  const kept = Array.from(short).length;
  const tail = Math.max(0, Math.min(Array.from(shown.text).length, FEED.maxChars) - kept);
  const every = tail > 0 ? Math.min(FEED.every, FEED.span / tail) : 0;
  const fed = tail > 0 ? FEED.at + (tail - 1) * every + FEED.each * 1000 : FEED.at;
  const roll = Math.max(FEED.at, fed - ROLL.overlap);
  const land = roll + (kept - 1) * ROLL.every * 1000 + ROLL.settle;
  return { every, fed, roll, land };
}

/** The home page's guest shortener, wired to ndle. */
export function HeroShortener({ onPass }: { onPass?: (link: YourLink) => void }) {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [guestUnavailable, setGuestUnavailable] = useState(false);
  const createGuestUrl = useMutation(api.urlMainFuction.createGuestUrl);

  useEffect(() => {
    let cancelled = false;
    ensureGuestSession()
      .then((session) => {
        if (!cancelled) setGuestSession(session);
      })
      .catch(() => {
        if (!cancelled) setGuestUnavailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const shorten = async (url: string) => {
    // In development, `?mock=<kind>` plays an outcome instead (shorten-mock.ts)
    if (process.env.NODE_ENV === "development") {
      const { isMockKind, mockShorten } = await import("./shorten-mock");
      const kind = new URLSearchParams(window.location.search).get("mock");
      if (isMockKind(kind)) return mockShorten(kind);
    }
    if (!guestSession) throw new ShortenProblem(guestUnavailable ? PROBLEMS.unavailable : PROBLEMS.connecting);
    const created = await createGuestUrl({
      url,
      guestId: guestSession.guestId,
      guestToken: guestSession.guestToken,
    });
    return { short: makeShortLink(created.slug), expiresAt: created.expiresAt };
  };

  return <ShortenForm shorten={shorten} onPass={onPass} />;
}

/** The form itself. `shorten` takes a normalized link and resolves to the
    short link without its scheme, or throws. */
export function ShortenForm({
  shorten,
  onPass,
}: {
  shorten: (url: string) => Promise<MadeLink>;
  /** Play a made link through the dashboard (your-link-takeover.tsx). */
  onPass?: (link: YourLink) => void;
}) {
  const reduce = useReducedMotion();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(IDLE);
  const [stage, setStage] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyBlocked, setCopyBlocked] = useState(false);
  // Pointing at "Sign up free" under a new link: its badge shows it watched.
  const [watchPreview, setWatchPreview] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);
  const copiedTimer = useRef<number | undefined>(undefined);
  // Set when the field should take focus once it's back on screen.
  const focusField = useRef(false);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  useLayoutEffect(() => {
    if (focusField.current && inputRef.current) {
      focusField.current = false;
      inputRef.current.focus();
    }
  });

  // One timer per beat; a new outcome clears the last one's.
  useEffect(() => {
    if (reduce || outcome.kind === "idle") return;
    let beats: number[];
    if (outcome.kind === "done") {
      const { roll, land } = schedule(outcome.shown, outcome.short);
      beats = [FEED.at, roll, land];
    } else {
      beats = [JAM.jammed, JAM.release];
    }
    const timers = beats.map((ms, i) => window.setTimeout(() => setStage(i + 1), ms));
    return () => timers.forEach(window.clearTimeout);
  }, [outcome, reduce]);

  const done = outcome.kind === "done";
  const landed = done && stage >= LANDED;

  const alarm = outcome.kind === "error" && stage >= 1;
  const jamming = outcome.kind === "error" && stage < SETTLED;

  const shownNow = (): Shown => ({
    text: url || PLACEHOLDER,
    placeholder: !url,
    scroll: inputRef.current?.scrollLeft ?? 0,
    hidden: hiddenChars(inputRef.current),
  });

  const begin = (next: Exclude<Outcome, { kind: "idle" }>) => {
    setOutcome(next);
    setStage(reduce ? (next.kind === "done" ? LANDED : SETTLED) : 0);
  };

  const fail = (problem: Problem) => {
    const shown = shownNow();
    begin({ kind: "error", id: ++nextId.current, shown, problem });
    // Back in the field to fix it, still showing the part of the link it
    // showed (focusing would scroll it to the caret)
    const input = inputRef.current;
    if (input) {
      input.focus({ preventScroll: true });
      input.scrollLeft = shown.scroll;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || done) return;
    if (!url.trim()) return fail(PROBLEMS.empty);
    const normalized = normalizeUrl(url);
    if (!normalized) return fail(PROBLEMS.invalid);

    setSubmitting(true);
    try {
      const { short, expiresAt } = await shorten(normalized);
      // Made: now the dashboard pass can play it. A refused link never gets one.
      onPass?.({ destination: normalized, short, expiresAt });
      // The field is about to become the result; keep focus on the form.
      const hadFocus = !!formRef.current?.contains(document.activeElement);
      begin({
        kind: "done",
        id: ++nextId.current,
        shown: shownNow(),
        short,
        destination: normalized,
        expiresAt,
      });
      setUrl("");
      setCopied(false);
      setCopyBlocked(false);
      if (hadFocus) buttonRef.current?.focus();
    } catch (error) {
      fail(problemFor(error));
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    if (outcome.kind !== "done") return;
    try {
      await navigator.clipboard.writeText(`https://${outcome.short}`);
      setCopied(true);
      setCopyBlocked(false);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_FOR);
    } catch {
      setCopyBlocked(true);
    }
  };

  const again = () => {
    setOutcome(IDLE);
    setStage(0);
    setCopied(false);
    setCopyBlocked(false);
    setWatchPreview(false);
    focusField.current = true;
  };

  const label: LabelKind = landed ? (copied ? "copied" : "copy") : submitting || done ? "shortening" : "shorten";

  return (
    <>
      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="hero-url" className="sr-only">
          Long link to shorten
        </label>
        {/* The field, and once a link lands, the link's card. Its first row
            is 42px plus the border, the 44px of the button beside it */}
        <div
          className={cn(
            "relative isolate flex min-w-0 flex-none flex-col rounded-md border bg-white shadow-xs transition-[border-color,box-shadow] duration-150 sm:flex-1",
            alarm
              ? "border-red-400 focus-within:ring-[3px] focus-within:ring-red-400/20"
              : done
                ? "border-border"
                : "border-border focus-within:border-[oklch(0.78_0.15_88)] focus-within:ring-[3px] focus-within:ring-[oklch(0.86_0.17_88/0.35)]",
          )}
        >
          {/* The light that passes over the field: yellow when a link is
              made, the way a new row lights up in the dashboard, and a
              fainter red when one is refused */}
          {landed && (
            <span
              key={`fresh-${outcome.id}`}
              aria-hidden
              className="h2-fresh pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
            />
          )}
          {alarm && (
            <span
              key={`alarm-${outcome.id}`}
              aria-hidden
              className="h2-alarm pointer-events-none absolute inset-0 -z-10 rounded-[inherit]"
            />
          )}

          <div className="flex h-[42px] items-center gap-2.5 px-3.5">
            <FieldMark mark={landed ? "done" : alarm ? "alert" : "link"} />

            {/* Clipped while a strip of characters is drawn over it; not after,
              so the short link's focus ring shows */}
            <div
              className={cn(
                "relative flex h-full min-w-0 flex-1 items-center font-mono text-sm leading-5",
                ((done && !landed) || jamming) && "overflow-hidden",
              )}
            >
              {outcome.kind === "done" ? (
                <>
                  {!landed && <Squeeze shown={outcome.shown} short={outcome.short} stage={stage} />}
                  <a
                    href={`https://${outcome.short}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={landed ? undefined : -1}
                    className={cn(
                      "inline-flex min-w-0 items-center gap-1.5 rounded-sm font-medium text-[var(--fg)] underline-offset-4 hover:underline",
                      !landed && "pointer-events-none",
                      FOCUS,
                    )}
                  >
                    {/* Hidden, not removed, under the strip: the strip lands
                      on exactly these characters */}
                    <span className={cn("truncate", !landed && "opacity-0")}>{outcome.short}</span>
                    <ArrowSquareOutIcon
                      size={14}
                      className={cn("shrink-0 text-[var(--fg-3)] transition-opacity duration-300", !landed && "opacity-0")}
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </>
              ) : (
                <>
                  <input
                    ref={inputRef}
                    id="hero-url"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      if (outcome.kind === "error") setOutcome(IDLE);
                    }}
                    placeholder={PLACEHOLDER}
                    readOnly={submitting}
                    aria-invalid={outcome.kind === "error" ? true : undefined}
                    aria-describedby="hero-url-note"
                    className={cn(
                      "h-full w-full min-w-0 bg-transparent text-[var(--fg)] caret-[var(--fg)] outline-none placeholder:text-[var(--fg-3)]",
                      // The jam draws the text itself for a moment
                      jamming && "text-transparent caret-transparent placeholder:text-transparent",
                    )}
                  />
                  {outcome.kind === "error" && jamming && <Jam key={outcome.id} shown={outcome.shown} />}
                </>
              )}
            </div>

            {outcome.kind === "done" && (
              <Savings key={`savings-${outcome.id}`} shown={outcome.shown} short={outcome.short} stage={stage} />
            )}
          </div>

          {outcome.kind === "done" && landed && <Record destination={outcome.destination} watched={watchPreview} />}
        </div>

        <div className="flex shrink-0 flex-col sm:min-w-[9.5rem]">
          <button
            ref={buttonRef}
            type={done ? "button" : "submit"}
            onClick={landed ? copy : undefined}
            aria-busy={label === "shortening" ? true : undefined}
            className={cn(
              "bg-accent text-accent-foreground hover:bg-accent/90 relative inline-flex h-11 shrink-0 items-center justify-center overflow-hidden rounded-md px-5 text-sm font-medium transition-[background-color,box-shadow,scale] duration-150 hover:shadow-sm active:scale-[0.98]",
              label === "shortening" && "cursor-progress",
              FOCUS,
            )}
          >
            <ButtonLabel kind={label} still={!!reduce} />
          </button>
          {landed && (
            <div className="h2-row-open" style={{ animationDelay: `${FINALE.unfold}ms` }}>
              {/* The clip reaches past the button, so its focus ring shows */}
              <div className="-mx-[5px] -mb-[5px] px-[5px] pb-[5px]">
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={
                      onPass && outcome.kind === "done"
                        ? () => onPass({ short: outcome.short, destination: outcome.destination, expiresAt: outcome.expiresAt })
                        : again
                    }
                    className={cn(
                      "border-border inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border bg-white px-5 text-sm font-medium text-[var(--fg)] shadow-xs transition-[background-color,scale] duration-150 hover:bg-[oklch(0.985_0_0)] active:scale-[0.98]",
                      FOCUS,
                    )}
                  >
                    {onPass ? (
                      <>
                        <ArrowsOutSimpleIcon size={15} />
                        See it in ndle
                      </>
                    ) : (
                      <>
                        <ArrowCounterClockwiseIcon size={15} />
                        Shorten another
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      <div id="hero-url-note" aria-live="polite" className="mt-3 min-h-5 font-mono text-xs leading-5 text-balance">
        {outcome.kind === "error" ? (
          <ProblemNote key={outcome.id} problem={outcome.problem} />
        ) : landed && copyBlocked ? (
          <ProblemNote problem={PROBLEMS.copyBlocked} />
        ) : landed ? (
          <p className="h2-settle text-[var(--fg-2)]" style={delay(FINALE.note)}>
            <span className="sr-only">Short link ready: {outcome.short}. </span>
            This guest link lasts 7 days. <SignUpLink onPoint={setWatchPreview} /> to keep it, and ndle checks it every 30
            minutes.
            {/* With the dashboard pass on the button, starting over moves down here */}
            {onPass && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={again}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-sm whitespace-nowrap text-[var(--fg)] underline decoration-[var(--line-2)] underline-offset-4 transition-colors hover:decoration-[var(--fg-3)]",
                    FOCUS,
                  )}
                >
                  <ArrowCounterClockwiseIcon aria-hidden size={12} />
                  Shorten another
                </button>
              </>
            )}
          </p>
        ) : done ? null : (
          <p className="text-[var(--fg-3)]">No sign-up. No ads. Guest links last 7 days; account links don&apos;t expire.</p>
        )}
      </div>
    </>
  );
}

/* ───────── Shortened: the strip, fed in and rolled over ───────── */

function Squeeze({ shown, short, stage }: { shown: Shown; short: string; stage: number }) {
  const chars = Array.from(shown.text).slice(0, FEED.maxChars);
  const target = Array.from(short);
  const kept = target.length;
  const { every, fed } = schedule(shown, short);
  const slots = Math.max(chars.length, kept);

  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre text-[var(--fg)]"
      // Starts where the field was scrolled to, and comes back to the start
      // as the link gets shorter
      initial={{ x: -shown.scroll }}
      animate={{ x: stage >= 1 ? 0 : -shown.scroll }}
      transition={{ duration: (fed - FEED.at) / 1000, ease: "easeOut" }}
    >
      {Array.from({ length: slots }, (_, i) =>
        i < kept ? (
          <RollChar key={i} from={chars[i]} to={target[i]} rolled={stage >= 2} delay={i * ROLL.every} />
        ) : (
          <FeedChar key={i} char={chars[i]} fed={stage >= 1} delay={((i - kept) * every) / 1000} />
        ),
      )}
      {/* The caret the tail feeds into */}
      <motion.span
        className="absolute top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full"
        style={{
          left: `calc(${Math.min(chars.length, kept)}ch - 1px)`,
          backgroundColor: CARET.color,
        }}
        initial={{ opacity: 0, scaleY: 0 }}
        animate={stage >= 2 ? { opacity: 0, scaleY: 0.4 } : { opacity: 1, scaleY: 1 }}
        transition={CARET.spring}
      />
    </motion.span>
  );
}

/** A character past the caret: it folds away into it on its turn. */
function FeedChar({ char, fed, delay }: { char: string; fed: boolean; delay: number }) {
  return (
    <motion.span
      className="inline-block overflow-hidden"
      initial={false}
      animate={fed ? { width: "0ch", opacity: 0, filter: FEED.blur } : { width: "1ch", opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: FEED.each, ease: "easeIn", delay }}
    >
      {char}
    </motion.span>
  );
}

/** A character before the caret: it rolls over into the short link's
    character in the same place, the way the dashboard's numbers roll. */
function RollChar({ from, to, rolled, delay }: { from?: string; to: string; rolled: boolean; delay: number }) {
  const transition = { ...ROLL.spring, delay };
  return (
    <motion.span
      className="relative inline-block h-5 overflow-hidden"
      // A link shorter than the short one has no character here yet
      initial={false}
      animate={{ width: from !== undefined || rolled ? "1ch" : "0ch" }}
      transition={transition}
    >
      {from !== undefined && (
        <motion.span
          className="absolute inset-0"
          initial={false}
          animate={rolled ? { y: "-100%", opacity: 0 } : { y: "0%", opacity: 1 }}
          transition={transition}
        >
          {from}
        </motion.span>
      )}
      {/* In the short link's weight */}
      <motion.span
        className="absolute inset-0 font-medium"
        initial={false}
        animate={rolled ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
        transition={transition}
      >
        {to}
      </motion.span>
    </motion.span>
  );
}

/** How many characters ndle took off, counting up as they go. */
function Savings({ shown, short, stage }: { shown: Shown; short: string; stage: number }) {
  const removed = Array.from(shown.text).length - Array.from(short).length;
  const reduce = useReducedMotion();
  const count = useMotionValue(reduce ? removed : 0);
  const text = useTransform(count, (n) => `−${Math.round(n)}`);
  const counting = stage >= 1;
  const { fed } = schedule(shown, short);

  useEffect(() => {
    if (!counting || reduce) return;
    const controls = animate(count, removed, {
      duration: (fed - FEED.at) / 1000,
      ease: "linear",
    });
    return () => controls.stop();
  }, [counting, reduce, count, removed, fed]);

  if (removed <= 0) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "shrink-0 font-mono text-xs whitespace-nowrap text-[var(--fg-3)] tabular-nums transition-opacity duration-200",
        counting ? "opacity-100" : "opacity-0",
      )}
    >
      <motion.span className="text-[var(--fg-2)]">{text}</motion.span> chars
    </span>
  );
}

/* ───────── Then: the link's card ───────── */

/** The card's second row, opened under the short link once it lands: the
    long link it stands for, and its status, the way the dashboard lists a
    link. A guest link isn't watched; `watched` previews what signing up
    changes. */
function Record({ destination, watched }: { destination: string; watched: boolean }) {
  return (
    <div className="h2-row-open" style={{ animationDelay: `${FINALE.unfold}ms` }}>
      <div>
        {/* 52px with its rule: the card grows by what the buttons do */}
        <div className="relative flex h-[52px] items-center gap-2.5 px-3.5 font-mono text-xs">
          <span
            aria-hidden
            className="h2-wipe absolute inset-x-0 top-0 border-t border-dashed border-[var(--dash)]"
            style={{ animationDelay: `${FINALE.unfold}ms` }}
          />
          <span className="h2-settle grid size-[17px] shrink-0 place-items-center" style={delay(FINALE.record)}>
            <SiteIcon url={destination} />
          </span>
          <span className="h2-settle min-w-0 flex-1 truncate text-left text-[var(--fg-3)]" style={delay(FINALE.record)}>
            <span className="sr-only">Goes to </span>
            {destination.replace(/^https?:\/\//, "")}
          </span>
          <span className="h2-settle shrink-0" style={delay(FINALE.badge)}>
            <WatchBadge watched={watched} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** The destination site's icon, as the dashboard shows it, at the size of
    the field's mark. */
function SiteIcon({ url }: { url: string }) {
  const { faviconUrl } = useFavicon(url);
  const [failed, setFailed] = useState(false);
  if (!faviconUrl || failed) return <GlobeSimpleIcon size={16} weight="duotone" className="text-[var(--fg-3)]" />;
  return (
    <Image
      src={faviconUrl}
      alt=""
      width={16}
      height={16}
      unoptimized
      onError={() => setFailed(true)}
      className="size-4 rounded-[3px] object-cover"
    />
  );
}

/* The dashboard's status badge, with the page's LED for a dot: unlit on a
   guest link, lit Signal Yellow while "Sign up free" is pointed at. Both
   labels share one cell, so the badge keeps its width. */
function WatchBadge({ watched }: { watched: boolean }) {
  return (
    <Badge variant="default" className="gap-1.5 font-mono">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full transition-[background-color,box-shadow] duration-300",
          watched && "shadow-[0_0_0_1px_oklch(0.7_0.14_80/0.5),0_0_6px_oklch(0.86_0.17_88/0.9)]",
        )}
        style={{ backgroundColor: watched ? "var(--sig)" : UNLIT }}
      />
      <span className="grid">
        <span className={cn("col-start-1 row-start-1 transition-opacity duration-200", watched && "opacity-0")}>not watched</span>
        <span aria-hidden className={cn("col-start-1 row-start-1 transition-opacity duration-200", !watched && "opacity-0")}>
          watched
        </span>
      </span>
    </Badge>
  );
}

/* ───────── Jammed: squeezed, and given back ───────── */

function Jam({ shown }: { shown: Shown }) {
  // Squeezed toward the field's left edge, not the start of the link: what
  // has scrolled out of sight stays put, out of sight
  const chars = Array.from(shown.text);
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre",
        shown.placeholder ? "text-[var(--fg-3)]" : "text-[var(--fg)]",
      )}
      style={{ transform: `translateX(${-shown.scroll}px)` }}
    >
      {chars.slice(0, shown.hidden).join("")}
      <motion.span
        initial={{ letterSpacing: JAM.spacing[0] }}
        animate={{ letterSpacing: JAM.spacing }}
        transition={{
          duration: JAM.duration,
          times: JAM.times,
          ease: "easeInOut",
        }}
      >
        {chars.slice(shown.hidden).join("")}
      </motion.span>
    </span>
  );
}

function ProblemNote({ problem }: { problem: Problem }) {
  return (
    <p className="h2-settle text-[var(--fg-2)]" style={delay(JAM.message)}>
      <span className="font-medium text-red-700">{problem.title}</span>
      {problem.detail && <> {problem.detail}</>}
      {problem.signUp && (
        <>
          {" "}
          <SignUpLink /> {problem.signUp}
        </>
      )}
    </p>
  );
}

function SignUpLink({ onPoint }: { onPoint?: (on: boolean) => void }) {
  return (
    <Link
      href={SIGN_UP}
      onPointerEnter={() => onPoint?.(true)}
      onPointerLeave={() => onPoint?.(false)}
      onFocus={() => onPoint?.(true)}
      onBlur={() => onPoint?.(false)}
      className={cn(
        "rounded-sm whitespace-nowrap text-[var(--fg)] underline decoration-[var(--sig)] decoration-2 underline-offset-4",
        FOCUS,
      )}
    >
      Sign up free
    </Link>
  );
}

/* ───────── The field's mark and the button's label ───────── */

function FieldMark({ mark }: { mark: "link" | "alert" | "done" }) {
  return (
    <span aria-hidden className="grid size-[17px] shrink-0 place-items-center">
      <AnimatePresence initial={false}>
        <motion.span
          key={mark}
          className="col-start-1 row-start-1 grid place-items-center"
          initial={{ opacity: 0, scale: MARK.from, filter: "blur(2px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: MARK.from, filter: "blur(2px)" }}
          transition={MARK.spring}
        >
          {mark === "link" && <LinkSimpleIcon size={17} className="text-[var(--fg-3)]" />}
          {mark === "alert" && (
            // The page's alert LED, lit, with one ping
            <span className="relative flex size-[9px]">
              <span className="h2-live-ping absolute inset-0 rounded-full" style={{ backgroundColor: RED }} />
              <span
                className="relative size-[9px] rounded-full shadow-[0_0_0_1px_oklch(0.5_0.2_27/0.45),0_0_8px_oklch(0.63_0.22_27/0.55)]"
                style={{ backgroundColor: RED }}
              />
            </span>
          )}
          {mark === "done" && (
            <span className="bg-accent flex size-4 items-center justify-center rounded-[4px] text-[var(--fg)]">
              <CheckIcon size={10} weight="bold" />
            </span>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

type LabelKind = "shorten" | "shortening" | "copy" | "copied";

const LABELS: Record<LabelKind, { text: string; Icon: typeof ArrowRightIcon; after?: boolean; spin?: boolean }> = {
  shorten: { text: "Shorten", Icon: ArrowRightIcon, after: true },
  shortening: { text: "Shortening…", Icon: CircleNotchIcon, spin: true },
  copy: { text: "Copy link", Icon: CopyIcon },
  copied: { text: "Copied", Icon: CheckIcon },
};

function ButtonLabel({ kind, still }: { kind: LabelKind; still: boolean }) {
  const { text, Icon, after, spin } = LABELS[kind];
  const icon = <Icon size={16} weight={kind === "copied" ? "bold" : undefined} className={cn(spin && "animate-spin")} />;
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={kind}
        className="inline-flex items-center gap-2"
        initial={{ opacity: 0, y: LABEL.offset, filter: "blur(4px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -LABEL.offset, filter: "blur(4px)" }}
        transition={still ? { duration: 0 } : LABEL.spring}
      >
        {!after && icon}
        {text}
        {after && icon}
      </motion.span>
    </AnimatePresence>
  );
}

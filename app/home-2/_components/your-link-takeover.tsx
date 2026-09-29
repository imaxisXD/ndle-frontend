"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { GeistSans } from "geist/font/sans";
import { useReducedMotion } from "motion/react";
import { LockSimpleIcon, TimerIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { PointerGlyph } from "./demo-cursor";
import { CURSOR, STAGE } from "./demo-script";
import { Glow, PaneShell } from "./glass-dashboard";
import { sampleTimeline, usePlayhead, type Timeline } from "./pass-timeline";
import { ActionLink, FOCUS } from "./kit";
import { YourHomePage, YourLinkPage, type YourLink } from "./your-link-pages";

/* The visitor's own link, played through the hero's dashboard. It opens as
   soon as the hero's shortener has the link back from the server (never
   for a link it refused), and again from the result card's See it in ndle
   button. The camera lifts the dashboard off the page and pushes in; the
   pointer pastes their link into it, shortens it, and opens its page; then
   they choose: sign up, log in, or back to the page, which sets the
   dashboard back down where it came from.

   It's a picture of what a free account does with their link, and says so:
   a new dashboard with one link in it, no clicks and no check yet. Nothing
   is sent anywhere; the choice at the end is plain links.

   The choreography is two timelines, PASS and BACK below, sampled every
   frame from one playhead each with Motion's spring and easing curves
   (pass-timeline.ts): every beat is one number to retime. */

/* ─────────────────────────────────────────────────────────
 * YOUR LINK   (s after Shorten is pressed, or See it in ndle)
 *
 *  ACT 1 · THE CAMERA MOVES IN
 *   0.00   the page dims and blurs behind the hero's dashboard (0.45)
 *   0.00   the dashboard turns into the visitor's own: their pane fades
 *          in over the hero's, in the same place (0.25)
 *   0.25   handoff: the hero's pane is hidden, and the camera lifts theirs
 *          to the middle of the screen, scaling it up to fill it (0.9,
 *          a little overshoot); its yellow light comes up behind it
 *   0.80   the caption rises in above it: "Preview · your link with a
 *          free account", and a close button
 *
 *  ACT 2 · THEIR PASS
 *   1.00   the pointer glides in to the Shorten field (0.55)
 *   1.60   click; the field focuses
 *   1.85   paste: their long link lands in the field, selected (0.6)
 *   2.15   the pointer heads for Shorten (0.5)
 *   2.70   click; "Shortening…"
 *   3.25   ready: their link opens into Recent Links (0.5), tinted yellow,
 *          and "Short link ready" pops up
 *          The tint fades from 3.8 (2.0)
 *   4.30   the pointer heads for their link in the row (0.5)
 *   4.85   click; the toast goes and their link's own page opens: no
 *          clicks yet, waiting for its first check
 *   5.30   the pointer fades out (0.3)
 *
 *  ACT 3 · LOCKED
 *   5.35   the stats lock: the link's tabs and health blur out and wash
 *          pale (0.6); the link and its Live Click Counter stay sharp
 *   5.60   the sign-up card rises in over the blur (0.5), with the link's
 *          expiry in red on top: unlock its clicks and checks. Sign up
 *          free, Log in, or Back to the page. The page comes alive: its
 *          short link, Copy, Share, QR and Open work, as in the dashboard
 *
 * BACK   (s after Back, the close button or Esc)
 *
 *   0.00   the end card and caption go (0.2); the light goes down (0.4)
 *   0.05   the camera sets the pane back down where it came from (0.6)
 *   0.10   the page comes back into focus (0.5)
 *   0.60   handback: the hero's pane shows again under it and theirs
 *          fades out (0.2); then the takeover is gone
 *
 * Reduced motion skips to the choice, and Back closes at once.
 * ───────────────────────────────────────────────────────── */

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_IN_OUT: [number, number, number, number] = [0.65, 0, 0.35, 1];

const PASS = {
  duration: 6.3,
  camera: {
    dim: {
      at: 0,
      duration: 0.45,
      from: { dim: 0, blur: 0 },
      to: { dim: 1, blur: 10 },
      transition: { type: "easing", duration: 0.45, ease: EASE_OUT },
    },
    swap: {
      at: 0,
      duration: 0.25,
      from: { opacity: 0 },
      to: { opacity: 1 },
      transition: { type: "easing", duration: 0.25, ease: EASE_OUT },
    },
    handoff: { at: 0.25, duration: 0 },
    lift: {
      at: 0.25,
      duration: 0.9,
      from: { progress: 0 },
      to: { progress: 1 },
      transition: { type: "spring", visualDuration: 0.9, bounce: 0.14 },
    },
    light: {
      at: 0.45,
      duration: 0.8,
      from: { glow: 0 },
      to: { glow: 1 },
      transition: { type: "easing", duration: 0.8, ease: EASE_OUT },
    },
    caption: {
      at: 0.8,
      duration: 0.4,
      from: { opacity: 0, y: 8 },
      to: { opacity: 1, y: 0 },
      transition: { type: "spring", visualDuration: 0.4, bounce: 0 },
    },
  },
  pointer: {
    show: { at: 1.0, duration: 0.2, from: { opacity: 0 }, to: { opacity: 1 } },
    toField: {
      at: 1.0,
      duration: 0.55,
      from: { leg: 0 },
      to: { leg: 1 },
      transition: { type: "spring", visualDuration: 0.55, bounce: 0 },
    },
    clickField: {
      at: 1.6,
      from: { scale: 1 },
      steps: [
        { duration: 0.09, to: { scale: 0.84 } },
        { duration: 0.13, to: { scale: 1 } },
      ],
    },
    toShorten: {
      at: 2.15,
      duration: 0.5,
      from: { leg: 1 },
      to: { leg: 2 },
      transition: { type: "spring", visualDuration: 0.5, bounce: 0 },
    },
    clickShorten: {
      at: 2.7,
      from: { scale: 1 },
      steps: [
        { duration: 0.09, to: { scale: 0.84 } },
        { duration: 0.13, to: { scale: 1 } },
      ],
    },
    toRow: {
      at: 4.3,
      duration: 0.5,
      from: { leg: 2 },
      to: { leg: 3 },
      transition: { type: "spring", visualDuration: 0.5, bounce: 0 },
    },
    clickRow: {
      at: 4.85,
      from: { scale: 1 },
      steps: [
        { duration: 0.09, to: { scale: 0.84 } },
        { duration: 0.13, to: { scale: 1 } },
      ],
    },
    hide: { at: 5.3, duration: 0.3, from: { opacity: 1 }, to: { opacity: 0 } },
  },
  dashboard: {
    focus: { at: 1.6, duration: 0 },
    paste: {
      at: 1.85,
      duration: 0.6,
      from: { flash: 1 },
      to: { flash: 0 },
      transition: { type: "easing", duration: 0.6, ease: EASE_IN_OUT },
    },
    shorten: { at: 2.7, duration: 0 },
    ready: { at: 3.25, duration: 0 },
    row: {
      at: 3.25,
      duration: 0.5,
      from: { open: 0 },
      to: { open: 1 },
      transition: { type: "spring", visualDuration: 0.5, bounce: 0 },
    },
    fresh: { at: 3.8, duration: 2.0, from: { tint: 1 }, to: { tint: 0 } },
    open: { at: 4.85, duration: 0 },
  },
  choice: {
    lock: {
      at: 5.35,
      duration: 0.6,
      from: { blur: 0, wash: 0 },
      to: { blur: 7, wash: 0.45 },
      transition: { type: "easing", duration: 0.6, ease: EASE_OUT },
    },
    card: {
      at: 5.6,
      duration: 0.5,
      from: { opacity: 0, y: 20 },
      to: { opacity: 1, y: 0 },
      transition: { type: "spring", visualDuration: 0.5, bounce: 0.1 },
    },
  },
} satisfies Timeline;

const BACK = {
  duration: 0.8,
  leave: { at: 0, duration: 0.2, from: { opacity: 1 }, to: { opacity: 0 } },
  light: { at: 0, duration: 0.4, from: { glow: 1 }, to: { glow: 0 } },
  lift: {
    at: 0.05,
    duration: 0.6,
    from: { progress: 1 },
    to: { progress: 0 },
    transition: { type: "spring", visualDuration: 0.6, bounce: 0 },
  },
  dim: {
    at: 0.1,
    duration: 0.5,
    from: { dim: 1, blur: 10 },
    to: { dim: 0, blur: 0 },
    transition: { type: "easing", duration: 0.5, ease: EASE_IN_OUT },
  },
  handback: { at: 0.6, duration: 0 },
  swap: { at: 0.6, duration: 0.2, from: { opacity: 1 }, to: { opacity: 0 } },
} satisfies Timeline;

/* Where the camera leaves the pane: centred, as large as fits, under the
   caption. On phones the end card sits under the pane instead of on it. */
const FRAME = {
  margin: 32, // px around the pane
  marginPhone: 16,
  caption: 40, // px above the pane for the caption
  cardBelow: 220, // px under the pane for the end card, on phones
  phone: 640, // px: narrower than this is a phone
  dimColor: "255 255 255", // the page behind, washed toward white
  dimAlpha: 0.72,
};

/* The pointer's stops, aimed at `data-pass` elements like the hero's
   pointer aims at `data-demo` ones; `ax`/`ay` pick the spot in each. */
const STOPS = [
  { to: "field", ax: 0.22, ay: 0.5 },
  { to: "shorten", ax: 0.5, ay: 0.5 },
  { to: "row", ax: 0.32, ay: 0.5 },
] as const;

/* Where the sign-up card sits on the pane, from its top: over the blurred
   stats, clear of the link's header. */
const CARD_AT = 0.68;

const SIGN_UP = "/sign-up?redirect_url=/dashboard";
const LOG_IN = "/sign-in?redirect_url=/dashboard";

type Box = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };

function frameFor(): { box: Box; phone: boolean } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const phone = vw < FRAME.phone;
  const margin = phone ? FRAME.marginPhone : FRAME.margin;
  const room = vh - margin * 2 - FRAME.caption - (phone ? FRAME.cardBelow : 0);
  const width = Math.max(0, Math.min(STAGE.width, vw - margin * 2, (room * STAGE.width) / STAGE.height));
  const height = (width * STAGE.height) / STAGE.width;
  return {
    phone,
    box: { left: (vw - width) / 2, top: margin + FRAME.caption + Math.max(0, (room - height) / 2), width, height },
  };
}

/** Where a `data-pass` element's spot is, in stage units. */
function aim(stage: HTMLElement, stop: (typeof STOPS)[number]): Point | null {
  const target = stage.querySelector(`[data-pass="${stop.to}"]`);
  if (!target) return null;
  const box = stage.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const scale = box.width / STAGE.width;
  return {
    x: (rect.left - box.left + rect.width * stop.ax) / scale,
    y: (rect.top - box.top + rect.height * stop.ay) / scale,
  };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function YourLinkTakeover({ link, onClose }: { link: YourLink; onClose: () => void }) {
  const reduce = useReducedMotion();
  const [closing, setClosing] = useState(false);

  const passHead = usePlayhead(PASS.duration);
  const backHead = usePlayhead(BACK.duration);
  const pass = sampleTimeline(PASS, passHead.time);
  const back = sampleTimeline(BACK, backHead.time);

  const heroRef = useRef<HTMLElement | null>(null);
  const [frame, setFrame] = useState<{ box: Box; phone: boolean } | null>(null);
  const [origin, setOrigin] = useState<Box | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [stops, setStops] = useState<Array<Point | null>>([null, null, null]);

  // Open: find the hero's pane, frame the shot, lock the page, and roll.
  useLayoutEffect(() => {
    const pane = document.querySelector<HTMLElement>("[data-hero-pane]");
    const measure = () => {
      setFrame(frameFor());
      const rect = pane?.getBoundingClientRect();
      setOrigin(rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null);
    };
    heroRef.current = pane;
    measure();
    window.addEventListener("resize", measure);
    const returnTo = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", measure);
      root.style.overflow = overflow;
      if (pane) pane.style.visibility = "";
      // Once the page is no longer inert, back to the button that opened it
      requestAnimationFrame(() => returnTo?.focus({ preventScroll: true }));
    };
  }, []);

  // Into the dialog as soon as it's drawn
  const drawn = frame !== null;
  useEffect(() => {
    if (drawn) closeRef.current?.focus({ preventScroll: true });
  }, [drawn]);

  useEffect(() => {
    if (reduce) passHead.end();
    else passHead.replay();
    // Once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leave = () => {
    if (closing) return;
    // Still covering the hero's pane where it stands: nothing to set back down
    if (reduce || !pass.camera.handoff.started) return onClose();
    setClosing(true);
    backHead.replay();
  };

  // Gone once the way back has played out.
  const backDone = closing && backHead.ended;
  useEffect(() => {
    if (backDone) onClose();
  }, [backDone, onClose]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ───── Read the playhead ───── */

  const camera = pass.camera;
  const dim = closing ? back.dim.current : camera.dim.current;
  const lift = closing ? back.lift.current.progress : camera.lift.current.progress;
  const glow = closing ? back.light.current.glow : camera.light.current.glow;
  const paneOpacity = closing ? back.swap.current.opacity : camera.swap.current.opacity;
  const heroHidden = closing ? !back.handback.started : camera.handoff.started;
  const chrome = closing ? back.leave.current.opacity : 1;
  const caption = camera.caption.current;
  const card = pass.choice.card.current;
  const cardUp = pass.choice.card.started && !closing;

  const dash = pass.dashboard;
  const page = dash.open.started ? "link" : "home";
  // At rest on the link's page: its header works like the dashboard's
  const settled = cardUp && page === "link";
  const listed = dash.ready.started;
  const focused = dash.focus.started && !listed;
  const pasted = dash.paste.started && !listed;
  const busy = dash.shorten.started && !listed;

  const p = pass.pointer;
  const leg = p.toField.current.leg + (p.toShorten.current.leg - 1) + (p.toRow.current.leg - 2);
  const clicks = [p.clickField, p.clickShorten, p.clickRow];
  const press = clicks.reduce((scale, click) => scale * click.current.scale, 1);
  const ripple = clicks.find((click) => click.active);
  const pointerOpacity = p.show.current.opacity * p.hide.current.opacity;

  // The hero's pane hides once theirs has covered it, and shows again on the way back.
  useLayoutEffect(() => {
    const pane = heroRef.current;
    if (pane) pane.style.visibility = heroHidden ? "hidden" : "";
  }, [heroHidden]);

  // Measure the pointer's stops against the stage as it's laid out now.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    // A stop that's gone (its page has closed) stays where it was last seen
    if (stage) setStops((last) => STOPS.map((stop, i) => aim(stage, stop) ?? last[i]));
  }, [page, listed, frame]);

  if (!frame) return null;
  const { box, phone } = frame;

  // The camera: at 0 the pane sits exactly on the hero's, at 1 it fills the
  // frame. Scaled about its centre, so an overshoot pushes in evenly.
  const from = origin ?? box;
  const scale = mix(from.width / box.width, 1, lift);
  const dx = mix(from.left + from.width / 2 - (box.left + box.width / 2), 0, lift);
  const dy = mix(from.top + from.height / 2 - (box.top + box.height / 2), 0, lift);

  const points: Point[] = [CURSOR.enter, ...stops.map((stop, i) => stop ?? (i === 0 ? CURSOR.enter : { x: 0, y: 0 }))];
  const at = Math.max(0, Math.min(points.length - 2, Math.floor(leg)));
  const pointer = {
    x: mix(points[at].x, points[at + 1].x, leg - at),
    y: mix(points[at].y, points[at + 1].y, leg - at),
  };

  const cardStyle: CSSProperties = phone
    ? { left: FRAME.marginPhone, right: FRAME.marginPhone, top: box.top + box.height + 16 }
    : { left: box.left + box.width / 2, top: box.top + box.height * CARD_AT, translate: "-50% -50%" };

  return createPortal(
    // Not showModal(): the top layer would cover the dashboard's tooltips,
    // which portal to the body; at z-45 they show over it. The page is made
    // inert instead (home-two.tsx), and Esc is handled here.
    <dialog
      open
      aria-modal="true"
      aria-labelledby="your-link-title"
      // Portalled out of the page, so it brings the page's sans with it
      className={cn(
        GeistSans.variable,
        "h2-day fixed inset-0 z-[45] m-0 size-full max-h-none max-w-none border-0 p-0 font-sans antialiased",
      )}
      style={{ background: "transparent" }}
    >
      {/* The page behind, washed out and out of focus */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundColor: `rgb(${FRAME.dimColor} / ${FRAME.dimAlpha * dim.dim})`,
          backdropFilter: `blur(${dim.blur}px)`,
          WebkitBackdropFilter: `blur(${dim.blur}px)`,
        }}
        onClick={leave}
      />

      {/* Their dashboard, on the camera */}
      <div
        className="absolute"
        style={{
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          opacity: paneOpacity,
          transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
        }}
      >
        {/* The hero's yellow light, coming up behind it */}
        <div aria-hidden className="absolute inset-0" style={{ opacity: glow }}>
          <Glow colors="rgba(255,201,33,0.36) 0%, rgba(255,176,32,0.24) 45%, rgba(255,201,33,0.3) 100%" />
        </div>
        <div
          ref={stageRef}
          className="absolute top-0 left-0 origin-top-left"
          style={{ width: STAGE.width, height: STAGE.height, transform: `scale(${box.width / STAGE.width})` }}
        >
          <PaneShell rail={page} interactive={settled}>
            <div className="relative min-w-0 flex-1">
              {page === "home" ? (
                <YourHomePage
                  link={link}
                  value={pasted ? link.destination : ""}
                  focused={focused}
                  flash={dash.paste.current.flash}
                  busy={busy}
                  pressed={1 - (1 - p.clickShorten.current.scale) * 0.25}
                  listed={listed}
                  open={dash.row.current.open}
                  fresh={dash.fresh.current.tint}
                  toast={listed}
                />
              ) : (
                <YourLinkPage link={link} locked={pass.choice.lock.current} interactive={settled} />
              )}
            </div>
          </PaneShell>

          {/* The pointer, in stage units, scaled with the stage */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 z-20"
            style={{ transform: `translate(${pointer.x}px, ${pointer.y}px)`, opacity: pointerOpacity }}
          >
            {ripple && (
              <span
                className="absolute -top-3.5 -left-3.5 size-7 rounded-full border-2 border-[oklch(0.8_0.16_85/0.9)]"
                style={{ scale: 0.3 + 1.2 * ripple.progress, opacity: 1 - ripple.progress }}
              />
            )}
            <span className="block origin-top-left" style={{ scale: press }}>
              <PointerGlyph />
            </span>
          </div>
        </div>
      </div>

      {/* The caption over the pane, and the way out */}
      <div
        className="absolute flex items-center justify-between gap-3 font-mono text-xs text-[var(--fg-2)]"
        style={{
          left: box.left,
          width: box.width,
          top: box.top - FRAME.caption + 8,
          opacity: caption.opacity * chrome,
          transform: `translateY(${caption.y}px)`,
        }}
      >
        <p id="your-link-title" className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-[var(--sig)] shadow-[0_0_6px_oklch(0.86_0.17_88/0.9)]" />
          <span className="truncate">
            Preview · <span className="text-[var(--fg)]">your link</span> with a free account
          </span>
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={leave}
          aria-label="Back to the page"
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--line-2)] bg-white/90 text-[var(--fg-2)] shadow-xs transition-colors hover:bg-white hover:text-[var(--fg)]",
            FOCUS,
          )}
        >
          <XIcon size={14} weight="bold" />
        </button>
      </div>

      {/* Act 3: the choice */}
      <div
        className={cn("absolute", !phone && "w-[min(480px,calc(100vw-64px))]", !cardUp && "pointer-events-none")}
        style={{ ...cardStyle, opacity: card.opacity * chrome, transform: `translateY(${card.y}px)` }}
        inert={!cardUp}
      >
        <div className="rounded-xl border border-black/[0.08] bg-white p-5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.06),0_24px_60px_-20px_rgb(0_0_0/0.35)]">
          <ExpiryNote expiresAt={link.expiresAt} />
          <p className="mt-3 flex items-center gap-2.5 text-base font-medium text-[var(--fg)]">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--sig)] text-[#141312]">
              <LockSimpleIcon size={15} weight="bold" />
            </span>
            Unlock your link&apos;s clicks and checks
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--fg-2)]">
            They&apos;re on your free account: live clicks, where they come from, and a check every 30 minutes. Sign up and this
            link moves into your account, where it doesn&apos;t expire.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ActionLink href={SIGN_UP}>Sign up free</ActionLink>
            <ActionLink href={LOG_IN} tone="outline">
              Log in
            </ActionLink>
            <button
              type="button"
              onClick={leave}
              className={cn(
                "ml-auto inline-flex h-10 items-center rounded-md px-3 text-sm text-[var(--fg-2)] transition-colors hover:text-[var(--fg)]",
                FOCUS,
              )}
            >
              Back to the page
            </button>
          </div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** How long the guest link has left, in red: the reason not to wait. */
function ExpiryNote({ expiresAt }: { expiresAt: number }) {
  const days = Math.max(1, Math.ceil((expiresAt - Date.now()) / DAY_MS));
  return (
    <p className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm font-medium text-red-700">
      <TimerIcon aria-hidden size={15} weight="bold" className="shrink-0" />
      This link expires in {days} {days === 1 ? "day" : "days"}.
    </p>
  );
}

"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useClerk } from "@clerk/nextjs";
import { useHotkeys } from "react-hotkeys-hook";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { FOCUS, HOME_PATH, Wordmark } from "./kit";

/* The site's nav, shared by the landing page and the blog. On the landing page
   its section links are in-page anchors; elsewhere (`home`) they lead back to
   the landing page's sections. S and G jump to sign-in and sign-up. The bar is
   an ink trapezium, textured as a board of unlit LEDs, with a dashed edge
   (NavShape). It hangs from the page's frame (PageFrame): the same ink run
   round the window's edges, with rounded corners inside. */

const SIGN_IN = "/sign-in?redirect_url=/dashboard";
const SIGN_UP = "/sign-up?redirect_url=/dashboard";

/** The ink's texture, on the bar and the page's frame: a board of unlit LEDs,
    barely there: a texture you notice, not a pattern you read. */
const LEDS = "radial-gradient(circle, rgb(255 255 255 / 0.045) 1.1px, transparent 1.6px)";
const LED_PITCH = "6px 6px";

/** The dashed edge, the bar's and the frame's. */
const DASH = { color: "rgb(255 255 255 / 0.55)", pattern: "4 4" };

function Kbd({ children, onAccent }: { children: string; onAccent?: boolean }) {
  return (
    <kbd
      className={cn(
        "hidden h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border px-1 font-mono text-xs leading-none sm:inline-flex",
        onAccent ? "border-black/20 bg-black/[0.06]" : "border-white/15 bg-white/[0.06] text-white/60",
      )}
    >
      {children}
    </kbd>
  );
}

/* The nav's entrance. The page is prerendered, so whether the visitor is
   signed in is only known once Clerk has loaded in the browser, a moment
   after the page shows. The actions wait for it, hidden, and rise in once
   it's known, so the first actions anyone sees are their own (Sign in and
   Get ndle, or Dashboard), never one set swapping for the other. The logo
   and the links are the same for everyone, so they don't wait on Clerk:
   they rise from the first paint, in CSS, before the page's scripts have
   run, so a slow Clerk never holds them back and nothing about them changes
   when it answers. Both sets of actions share one cell (Actions), so the bar
   is its final width from the first paint, whichever set shows. */

/* ─────────────────────────────────────────────────────────
 * NAV ENTRANCE   (a fresh page load)
 *
 *     0ms   the logo       fades in as it rises 4px, over 250ms
 *    40ms   the links      one after another, 40ms apart (from md); the
 *                          last is in by 450ms
 *
 *           the actions    once Clerk has loaded, the visitor's own: the
 *                          first straight away, the next 40ms after
 * ───────────────────────────────────────────────────────── */

/** Between one item's entrance and the next's. */
const STEP = 40;

/** Each item's entrance: tw-animate-css's `enter`, from clear and 4px down
    (fade-in, slide-in-from-bottom-1). `backwards` keeps the item hidden
    through its delay. With reduced motion there's none: the item is just
    there. */
const RISE =
  "fade-in slide-in-from-bottom-1 animate-[enter_250ms_cubic-bezier(0.16,1,0.3,1)_backwards] motion-reduce:animate-none";

/** The `n`th item's delay into the entrance. */
function beat(n: number): CSSProperties {
  return { animationDelay: `${n * STEP}ms` };
}

/** What this page load has shown so far: the nav, and the visitor's actions.
    Each rises in only the first time. Kept outside the nav, since it
    outlasts any one nav: Clerk loading remounts the whole page (the account
    boundary in ConvexClientProvider), and moving to another page with the
    nav mounts a new one. The server never sets it. */
const seen = { nav: false, actions: false };

/** `home`: prefix for the section links, "" on the landing page itself. */
export function SiteNav({ home = "" }: { home?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { status } = useClerk();
  // Clerk has said whether the visitor is signed in. If it can't load at
  // all, the signed-out actions show, so there's still a way in.
  const known = isLoaded || status === "error";
  const signedIn = !!isSignedIn;
  // A fresh page load: the logo and links rise with the first paint, and the
  // actions once they show. After that, a nav is simply there.
  const [entering] = useState(() => ({ nav: !seen.nav, actions: !seen.actions }));
  useEffect(() => {
    seen.nav = true;
    if (known) seen.actions = true;
  }, [known]);
  const router = useRouter();

  // Only once the visitor's actions show, and to where they lead
  useHotkeys("s", () => router.push(SIGN_IN), { enabled: known && !signedIn });
  useHotkeys("g", () => router.push(signedIn ? "/dashboard" : SIGN_UP), { enabled: known });

  const rise = entering.nav ? RISE : undefined;
  const navLink = cn("rounded-sm px-2 py-1 text-sm text-white/65 transition-colors hover:text-white", FOCUS, rise);
  const barRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <a
        href="#main"
        className={cn(
          "bg-accent text-accent-foreground sr-only z-50 rounded-md px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3",
          FOCUS,
        )}
      >
        Skip to content
      </a>
      <PageFrame bar={barRef} />
      {/* The bar is only as wide as what it holds; the strip either side of it
          lets clicks through to the page. It sits just under the frame's top,
          so its flared sides curve out of the frame. */}
      <header className="pointer-events-none sticky top-0 z-40 pt-[var(--frame)] [--frame:6px] sm:[--frame:10px]">
        {/* --bg is the bar's own ink here, so FOCUS rings offset against it. The
            side padding clears the slant, then leaves room to breathe. */}
        <div
          ref={barRef}
          className="pointer-events-auto relative isolate mx-auto flex h-16 w-fit max-w-full items-center gap-6 px-12 [--bg:var(--ink-deep)] md:gap-8 md:px-14 lg:gap-12 lg:px-16">
          <NavShape />
          <LogoWithMenu className={rise} />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex lg:gap-3">
            <a href={`${home}#monitoring`} className={navLink} style={beat(1)}>
              Monitoring
            </a>
            <a href={`${home}#analytics`} className={navLink} style={beat(2)}>
              Analytics
            </a>
            <a href={`${home}#collections`} className={navLink} style={beat(3)}>
              Collections
            </a>
            <a href={`${home}#pricing`} className={navLink} style={beat(4)}>
              Free plan
            </a>
            <Link href="/blog" className={navLink} style={beat(5)}>
              Blog
            </Link>
          </nav>
          <div className="grid justify-items-end">
            <Actions signedIn={false} shown={known && !signedIn} rise={entering.actions} />
            <Actions signedIn shown={known && signedIn} rise={entering.actions} />
          </div>
        </div>
      </header>
    </>
  );
}

/** The actions for a visitor signed out (Sign in, Get ndle) or signed in
    (Dashboard). Both sets are always there, in the same grid cell, so the
    cell is as wide as the wider set, signed out, and the bar keeps one width
    before either shows and whichever does. A signed-in visitor's Dashboard
    sits at the cell's end, where Get ndle would be. The set that isn't shown
    is invisible, which also keeps it out of the tab order, screen readers
    and clicks, and it doesn't prefetch where it leads. `rise`: play the
    entrance as the set shows. */
function Actions({ signedIn, shown, rise }: { signedIn: boolean; shown: boolean; rise: boolean }) {
  const enter = shown && rise ? RISE : undefined;
  const prefetch = shown ? undefined : false;
  return (
    <div className={cn("col-start-1 row-start-1 flex items-center gap-2", !shown && "invisible")}>
      {!signedIn && (
        <Link
          href={SIGN_IN}
          prefetch={prefetch}
          style={beat(0)}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white transition-colors hover:bg-white/10",
            FOCUS,
            enter,
          )}
        >
          Sign in
          <Kbd>S</Kbd>
        </Link>
      )}
      <Link
        href={signedIn ? "/dashboard" : SIGN_UP}
        prefetch={prefetch}
        style={beat(signedIn ? 0 : 1)}
        className={cn(
          "bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors",
          FOCUS,
          enter,
        )}
      >
        {signedIn ? "Dashboard" : "Get ndle"}
        <Kbd onAccent>G</Kbd>
      </Link>
    </div>
  );
}

/* The page's frame: the bar's ink and its LED board carried round the
   window's edges, as if the page were set in it, so the bar and the frame
   are one piece. Four strips along the edges and four corner pieces rounding
   the window inside (the ink outside a quarter circle). The board's dots are
   laid against the window, not each piece (the bar's too), so they run on
   unbroken from one piece to the next and into the bar. The bar's dashed edge
   carries on round the frame's inside, from where the bar leaves the top
   edge on one side to where it comes back on the other. Thinner on phones.
   It's over the page (and under dialogs and tooltips), and lets every click
   through. */
const INK_BOARD: CSSProperties = {
  backgroundColor: "var(--ink-deep)",
  backgroundImage: LEDS,
  backgroundSize: LED_PITCH,
  backgroundAttachment: "fixed",
};

/** Each corner piece: where it sits, and where its quarter circle is centred. */
const FRAME_CORNERS = [
  { place: "top-[var(--t)] left-[var(--t)]", at: "100% 100%" },
  { place: "top-[var(--t)] right-[var(--t)]", at: "0% 100%" },
  { place: "bottom-[var(--t)] left-[var(--t)]", at: "100% 0%" },
  { place: "right-[var(--t)] bottom-[var(--t)]", at: "0% 0%" },
];

/** The frame's dashed line: round its inside, 1px into the ink, leaving out
    the stretch of the top edge the bar hangs from (`from` to `to`). */
function frameDashes({ w, h, t, r, from, to }: { w: number; h: number; t: number; r: number; from: number; to: number }) {
  const e = t - 0.5; // the line's centre, just inside the ink
  const k = r + 0.5; // the corner, followed round at the line's radius
  return [
    `M${from} ${e}`,
    `H${e + k}`,
    `A${k} ${k} 0 0 0 ${e} ${e + k}`,
    `V${h - e - k}`,
    `A${k} ${k} 0 0 0 ${e + k} ${h - e}`,
    `H${w - e - k}`,
    `A${k} ${k} 0 0 0 ${w - e} ${h - e - k}`,
    `V${e + k}`,
    `A${k} ${k} 0 0 0 ${w - e - k} ${e}`,
    `H${to}`,
  ].join(" ");
}

function PageFrame({ bar }: { bar: RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dashes, setDashes] = useState<{ d: string; w: number; h: number } | null>(null);

  // Where the bar leaves and rejoins the top edge, and the frame's size
  useEffect(() => {
    const frame = ref.current;
    const nav = bar.current;
    if (!frame || !nav) return;
    const measure = () => {
      const style = getComputedStyle(frame);
      const t = parseFloat(style.getPropertyValue("--t"));
      const r = parseFloat(style.getPropertyValue("--r"));
      // The frame's own box: the window less any scrollbar, which the
      // window's inner size would count
      const { clientWidth: w, clientHeight: h } = frame;
      const box = nav.getBoundingClientRect();
      setDashes({ w, h, d: frameDashes({ w, h, t, r, from: box.left, to: box.right }) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [bar]);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[41] [--r:14px] [--t:6px] sm:[--r:20px] sm:[--t:10px]">
      {["inset-x-0 top-0 h-[var(--t)]", "inset-x-0 bottom-0 h-[var(--t)]", "inset-y-0 left-0 w-[var(--t)]", "inset-y-0 right-0 w-[var(--t)]"].map(
        (edge) => (
          <div key={edge} className={cn("absolute", edge)} style={INK_BOARD} />
        ),
      )}
      {FRAME_CORNERS.map(({ place, at }) => (
        <div
          key={at}
          className={cn("absolute size-[var(--r)]", place)}
          style={{
            ...INK_BOARD,
            maskImage: `radial-gradient(circle at ${at}, transparent calc(var(--r) - 0.5px), #000 var(--r))`,
          }}
        />
      ))}
      {dashes && (
        <svg viewBox={`0 0 ${dashes.w} ${dashes.h}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          <path d={dashes.d} fill="none" stroke={DASH.color} strokeWidth={1} strokeDasharray={DASH.pattern} />
        </svg>
      )}
    </div>
  );
}

/* The bar's shape: a trapezium hanging from the top edge, its sides leaning in
   by SLANT over its height, flaring into the top edge and rounded at the
   bottom. The ink is a dot-matrix sign's board, the frame's (INK_BOARD): a
   grid of unlit LEDs, and the wordmark is the part that's lit. A dashed edge
   runs down the sides and along the bottom, and on round the frame. */

const SLANT = 32; // how far each side leans in over the bar's height
const FLARE = 12; // the concave curve where each side leaves the top edge
const ROUND = 12; // the bottom corners
const FOOT = FLARE + SLANT; // where each side meets the bottom, before rounding

/** Until the bar is measured: the same sides, without the curves. */
const TRAPEZIUM = `polygon(${FLARE}px 0, calc(100% - ${FLARE}px) 0, calc(100% - ${FOOT}px) 100%, ${FOOT}px 100%)`;

/** The edge for a bar `w` by `h`: from the top-left corner down the left side,
    along the bottom and up the right side. Closed along the top, the ink. */
function edgePath(w: number, h: number) {
  const len = Math.hypot(SLANT, h);
  const [dx, dy] = [SLANT / len, h / len]; // one pixel down the left side
  const p = (x: number, y: number) => `${+x.toFixed(2)} ${+y.toFixed(2)}`;
  return [
    "M0 0",
    `Q${p(FLARE, 0)} ${p(FLARE + dx * FLARE, dy * FLARE)}`,
    `L${p(FOOT - dx * ROUND, h - dy * ROUND)}`,
    `Q${p(FOOT, h)} ${p(FOOT + ROUND, h)}`,
    `H${+(w - FOOT - ROUND).toFixed(2)}`,
    `Q${p(w - FOOT, h)} ${p(w - FOOT + dx * ROUND, h - dy * ROUND)}`,
    `L${p(w - FLARE - dx * FLARE, dy * FLARE)}`,
    `Q${p(w - FLARE, 0)} ${p(w, 0)}`,
  ].join(" ");
}

function NavShape() {
  const ref = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const edge = size && edgePath(size.w, size.h);

  useEffect(() => {
    const ink = ref.current;
    if (!ink) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: width, h: height });
    });
    observer.observe(ink);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        ref={ref}
        aria-hidden
        style={{ ...INK_BOARD, clipPath: edge ? `path("${edge} Z")` : TRAPEZIUM }}
        className="pointer-events-none absolute inset-0 -z-10 size-full"
      />
      {size && edge && (
        <svg aria-hidden viewBox={`0 0 ${size.w} ${size.h}`} className="pointer-events-none absolute inset-0 -z-10 size-full">
          <clipPath id={clipId}>
            <path d={`${edge} Z`} />
          </clipPath>
          {/* Stroked 2px wide and clipped to the ink, so its inner pixel shows. */}
          <path
            d={edge}
            clipPath={`url(#${clipId})`}
            fill="none"
            stroke={DASH.color}
            strokeWidth={2}
            strokeDasharray={DASH.pattern}
          />
        </svg>
      )}
    </>
  );
}

/* Right-click the logo to copy the wordmark as an SVG. `className` goes on
   the logo's link, not round the menu: the entrance's transform would carry
   the fixed menu with it. */
function LogoWithMenu({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof MouseEvent && menuRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close);
    };
  }, [menu]);

  const copySvg = async () => {
    const mark = wrapRef.current;
    if (!mark) return;
    const { width, height } = mark.getBoundingClientRect();
    const w = Math.ceil(width);
    const h = Math.ceil(height);
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><text x="0" y="${Math.round(h * 0.8)}" font-family="Geist, Inter, system-ui, sans-serif" font-size="${h}" font-weight="600" letter-spacing="${(-0.05 * h).toFixed(1)}" fill="#ffc921">ndle</text></svg>`;
    try {
      await navigator.clipboard.writeText(markup);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
        setMenu(null);
      }, 900);
    } catch {
      setMenu(null);
    }
  };

  return (
    <>
      <Link
        href={HOME_PATH}
        aria-label="ndle home. Right-click to copy the logo."
        onContextMenu={(event) => {
          event.preventDefault();
          setCopied(false);
          setMenu({ x: event.clientX, y: event.clientY });
        }}
        className={cn("-m-1 rounded-sm p-1", FOCUS, className)}
      >
        <span ref={wrapRef} className="block">
          {/* The yellow needs no amber hairline on black. */}
          <Wordmark className="font-doto roundness-100 text-[36px] font-black [text-shadow:none]" />
        </span>
      </Link>
      {menu && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Logo"
          className="h2-settle fixed z-50 w-52 rounded-lg border border-black/[0.08] bg-white p-1 text-sm text-[var(--fg)] shadow-[0_2px_8px_rgba(0,0,0,0.1)]"
          style={{ left: menu.x, top: menu.y + 6 }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={copySvg}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-[oklch(0.96_0_0)] focus-visible:bg-[oklch(0.96_0_0)] focus-visible:outline-none"
          >
            {copied ? <CheckIcon size={14} weight="bold" /> : <CopyIcon size={14} />}
            {copied ? "Copied" : "Copy logo as SVG"}
          </button>
        </div>
      )}
    </>
  );
}

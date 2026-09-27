"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useHotkeys } from "react-hotkeys-hook";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { FOCUS, HOME_PATH, Wordmark } from "./kit";

/* The site's nav, shared by the landing page and the blog. On the landing page
   its section links are in-page anchors; elsewhere (`home`) they lead back to
   the landing page's sections. S and G jump to sign-in and sign-up. The bar is
   an ink trapezium hanging from the top edge, with a dithered glow and a dashed
   edge (NavShape). */

const SIGN_IN = "/sign-in?redirect_url=/dashboard";
const SIGN_UP = "/sign-up?redirect_url=/dashboard";

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

/** `home`: prefix for the section links, "" on the landing page itself. */
export function SiteNav({ home = "" }: { home?: string }) {
  const { isSignedIn } = useAuth();
  const signedIn = !!isSignedIn;
  const router = useRouter();

  useHotkeys("s", () => router.push(SIGN_IN), { enabled: !signedIn });
  useHotkeys("g", () => router.push(signedIn ? "/dashboard" : SIGN_UP));

  const navLink = cn("rounded-sm px-2 py-1 text-sm text-white/65 transition-colors hover:text-white", FOCUS);

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
      {/* The bar is only as wide as what it holds; the strip either side of it
          lets clicks through to the page. */}
      <header className="pointer-events-none sticky top-0 z-40">
        {/* --bg is the bar's own ink here, so FOCUS rings offset against it. The
            side padding clears the slant, then leaves room to breathe. */}
        <div className="pointer-events-auto relative isolate mx-auto flex h-16 w-fit max-w-full items-center gap-6 px-12 [--bg:var(--ink-deep)] md:gap-8 md:px-14 lg:gap-12 lg:px-16">
          <NavShape />
          <LogoWithMenu />
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex lg:gap-3">
            <a href={`${home}#monitoring`} className={navLink}>
              Monitoring
            </a>
            <a href={`${home}#analytics`} className={navLink}>
              Analytics
            </a>
            <a href={`${home}#collections`} className={navLink}>
              Collections
            </a>
            <a href={`${home}#pricing`} className={navLink}>
              Free plan
            </a>
            <Link href="/blog" className={navLink}>
              Blog
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            {!signedIn && (
              <Link
                href={SIGN_IN}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-white transition-colors hover:bg-white/10",
                  FOCUS,
                )}
              >
                Sign in
                <Kbd>S</Kbd>
              </Link>
            )}
            <Link
              href={signedIn ? "/dashboard" : SIGN_UP}
              className={cn(
                "bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-9 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors",
                FOCUS,
              )}
            >
              {signedIn ? "Dashboard" : "Get ndle"}
              <Kbd onAccent>G</Kbd>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

/* The bar's shape: a trapezium hanging from the top edge, its sides leaning in
   by SLANT over its height, flaring into the top edge and rounded at the
   bottom. The ink carries an ordered dither (Bayer 8×8) of a glow that gathers
   along the bottom edge: a broad band sweeps it left to right while a finer
   ripple runs back against it, and dots brighten a little where the glow is
   strongest, so the sweep reads even though the dots are faint. One canvas
   pixel per 2px cell, scaled up without smoothing, redrawn at a steppy 20fps,
   still under reduced motion. The dashed edge runs down the sides and along
   the bottom. */

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

const CELL = 2;
const FPS = 20;
const DIM = [22, 21, 19]; // the faintest dots: a warm grey, barely lifted off the ink
const LIT = [58, 56, 52]; // dots where the glow is strongest

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

/** Glow at `px` CSS pixels across, `t` down (0 top, 1 bottom) and `s` seconds
    in, from 0 to 1. */
function glow(px: number, t: number, s: number) {
  const band = 0.5 + 0.5 * Math.sin(px / 80 - s * 1.2); // ~500px wide, ~95px/s
  const ripple = 0.5 + 0.5 * Math.sin(px / 26 + s * 2.1 + t * 2.4); // ~160px wide, ~55px/s
  return t ** 1.3 * (0.1 + 0.7 * band + 0.2 * ripple) * 0.85;
}

function NavShape() {
  const ref = useRef<HTMLCanvasElement>(null);
  const clipId = useId();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const edge = size && edgePath(size.w, size.h);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let image: ImageData | null = null;
    let seconds = 0;

    const draw = () => {
      if (!image) return;
      const { width: cols, height: rows, data } = image;
      data.fill(0);
      for (let y = 0; y < rows; y++) {
        const t = rows > 1 ? y / (rows - 1) : 1;
        for (let x = 0; x < cols; x++) {
          const v = glow(x * CELL, t, seconds);
          if (v <= (BAYER_8[(y % 8) * 8 + (x % 8)] + 0.5) / 64) continue;
          const i = (y * cols + x) * 4;
          for (let c = 0; c < 3; c++) data[i + c] = DIM[c] + (LIT[c] - DIM[c]) * v;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    const resize = ([entry]: ResizeObserverEntry[]) => {
      const { width, height } = entry.contentRect;
      const cols = Math.ceil(width / CELL);
      const rows = Math.ceil(height / CELL);
      canvas.width = cols;
      canvas.height = rows;
      image = cols && rows ? ctx.createImageData(cols, rows) : null;
      draw();
      setSize({ w: width, h: height });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let frame = 0;
    let last = -Infinity;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 1000 / FPS) return;
      last = now;
      seconds = now / 1000;
      draw();
    };
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) frame = requestAnimationFrame(tick);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <canvas
        ref={ref}
        aria-hidden
        style={{ clipPath: edge ? `path("${edge} Z")` : TRAPEZIUM }}
        className="pointer-events-none absolute inset-0 -z-10 size-full bg-[var(--bg)] [image-rendering:pixelated]"
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
            stroke="rgb(255 255 255 / 0.55)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        </svg>
      )}
    </>
  );
}

/* Right-click the logo to copy the wordmark as an SVG. */
function LogoWithMenu() {
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
        className={cn("-m-1 rounded-sm p-1", FOCUS)}
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

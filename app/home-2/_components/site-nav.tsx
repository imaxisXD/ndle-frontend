"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useHotkeys } from "react-hotkeys-hook";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { FOCUS, HOME_PATH, Wordmark } from "./kit";

/* The site's nav, shared by the landing page and the blog. On the landing page
   its section links are in-page anchors; elsewhere (`home`) they lead back to
   the landing page's sections. S and G jump to sign-in and sign-up. */

const SIGN_IN = "/sign-in?redirect_url=/dashboard";
const SIGN_UP = "/sign-up?redirect_url=/dashboard";

function Kbd({ children, onAccent }: { children: string; onAccent?: boolean }) {
  return (
    <kbd
      className={cn(
        "hidden h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border px-1 font-mono text-xs leading-none sm:inline-flex",
        onAccent ? "border-black/20 bg-black/[0.06]" : "border-black/15 bg-white text-[var(--fg-3)]",
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
  const [scrolled, setScrolled] = useState(false);

  useHotkeys("s", () => router.push(SIGN_IN), { enabled: !signedIn });
  useHotkeys("g", () => router.push(signedIn ? "/dashboard" : SIGN_UP));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLink = cn("rounded-sm px-2 py-1 text-sm text-[var(--fg-2)] transition-colors hover:text-[var(--fg)]", FOCUS);

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
      <header
        className={cn(
          "sticky top-0 z-40 border-b transition-colors duration-200",
          scrolled ? "border-[var(--line)] bg-[color-mix(in_oklab,var(--bg)_88%,transparent)] backdrop-blur-md" : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8">
          <LogoWithMenu />
          <nav aria-label="Main" className="hidden items-center gap-3 md:flex">
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
                  "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-[var(--fg)] transition-colors hover:bg-black/[0.05]",
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
          <Wordmark className="text-[28px]" />
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

"use client";

import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CheckIcon,
  CircleNotchIcon,
  CopyIcon,
  LinkSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { api } from "@/convex/_generated/api";
import { ensureGuestSession, type GuestSession } from "@/lib/guest";
import { makeShortLink } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Closing } from "./closing";
import { Compare } from "./compare";
import { Faq } from "./faq";
import { FeatureBento } from "./feature-bento";
import { bebas } from "./fonts";
import { GlassDashboard } from "./glass-dashboard";
import { SiteNav } from "./site-nav";
import { Statement } from "./statement";

type GuestRow = { short: string; destination: string };

/* ─────────────────────────────────────────────────────────
 * HERO STORYBOARD   (CSS, runs before hydration)
 *
 *     0ms   "Short"        rises out of blur
 *    70ms   "links,"
 *   260ms   "watched"      rises like the rest, in the page's tall capitals;
 *                          its full stop is a live yellow LED
 *   420ms   description    rises as one block
 *   540ms   form           rises as one block
 *
 *   680ms   the dashboard rises behind glass; once it is on screen it
 *           plays a pass through the product (glass-dashboard.tsx), with
 *           chapters and Replay under it
 * ───────────────────────────────────────────────────────── */

const DELAY = { word: 70, watched: 260, copy: 420, form: 540, pane: 680 };

const SIGN_UP = "/sign-up?redirect_url=/dashboard";

const FOCUS_RING =
  "focus-visible:ring-[3px] focus-visible:ring-[oklch(0.86_0.17_88/0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none";

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

export function HomeTwo() {
  const { isSignedIn } = useAuth();
  const signedIn = !!isSignedIn;

  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [guestUnavailable, setGuestUnavailable] = useState(false);
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GuestRow | null>(null);
  const [copied, setCopied] = useState(false);
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Paste a link first.");
      return;
    }
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("Enter a link like example.com/page.");
      return;
    }
    if (!guestSession) {
      setError(
        guestUnavailable
          ? "Guest shortening is unavailable right now. Sign up free to shorten links."
          : "Still connecting. Try again in a second.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const created = await createGuestUrl({
        url: normalized,
        guestId: guestSession.guestId,
        guestToken: guestSession.guestToken,
      });
      setResult({ short: makeShortLink(created.slug), destination: normalized.replace(/^https?:\/\//, "") });
      setCopied(false);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to shorten that link. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`https://${result.short}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Copying was blocked. Select the link and copy it by hand.");
    }
  };

  return (
    <div className={cn(bebas.variable, "h2-day h2-canvas min-h-dvh overflow-x-clip font-sans antialiased")}>
      <SiteNav />

      <main id="main">
        {/* ───────── Hero: day one, switched on ───────── */}
        <section id="top" aria-labelledby="hero-title" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 pt-14 sm:px-8 lg:pt-20">
          <div className="flex flex-col items-center text-center">
            <h1
              id="hero-title"
              className="text-[clamp(2.6rem,5vw,4rem)] leading-[1.02] font-medium tracking-[-0.035em] text-[var(--fg)]"
            >
              <span className="h2-rise inline-block" style={delay(0)}>
                Short
              </span>{" "}
              <span className="h2-rise inline-block" style={delay(DELAY.word)}>
                links,
              </span>
              <br />
              <span className="h2-rise inline-block" style={delay(DELAY.watched)}>
                {/* In the tall capitals the rest of the page uses for its
                    titles; leading after the size so it isn't dropped */}
                <span className="font-[family-name:var(--font-bebas)] text-[1.32em] leading-[0.9] font-normal tracking-[-0.005em] uppercase">
                  watched
                </span>
                <span className="h2-led" />
                <span className="sr-only">.</span>
              </span>
            </h1>

            <p className="h2-rise-block mt-6 max-w-[48ch] text-base leading-7 text-[var(--fg-2)]" style={delay(DELAY.copy)}>
              ndle is a free URL shortener that checks every link every 30 minutes and flags the ones that break.
            </p>

            <div className="h2-rise-block mt-8 w-full max-w-[560px]" style={delay(DELAY.form)}>
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2 sm:flex-row">
                <label htmlFor="hero-url" className="sr-only">
                  Long link to shorten
                </label>
                <div
                  className={cn(
                    "flex h-11 min-w-0 flex-none items-center gap-2.5 rounded-md border bg-white px-3.5 shadow-xs transition-[border-color,box-shadow] duration-150 focus-within:border-[oklch(0.78_0.15_88)] focus-within:ring-[3px] focus-within:ring-[oklch(0.86_0.17_88/0.35)] sm:flex-1",
                    error ? "border-red-400" : "border-border",
                  )}
                >
                  <LinkSimpleIcon size={17} className="shrink-0 text-[var(--fg-3)]" />
                  <input
                    id="hero-url"
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    spellCheck={false}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste your long link here…"
                    aria-invalid={error ? true : undefined}
                    aria-describedby="hero-url-note"
                    disabled={submitting}
                    className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm text-[var(--fg)] caret-[var(--fg)] outline-none placeholder:text-[var(--fg-3)] disabled:opacity-60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-[background-color,box-shadow,transform] duration-150 hover:shadow-sm active:scale-[0.98] disabled:cursor-progress disabled:opacity-80",
                    FOCUS_RING,
                  )}
                >
                  {submitting ? (
                    <>
                      <CircleNotchIcon size={16} className="animate-spin" />
                      Shortening…
                    </>
                  ) : (
                    <>
                      Shorten
                      <ArrowRightIcon size={16} />
                    </>
                  )}
                </button>
              </form>

              <div id="hero-url-note" aria-live="polite" className="mt-3 min-h-5 font-mono text-xs">
                {error ? (
                  <p className="flex items-start justify-center gap-1.5 text-red-700">
                    <WarningCircleIcon size={15} className="mt-px shrink-0" />
                    {error}
                  </p>
                ) : result ? null : (
                  <p className="text-[var(--fg-3)]">No sign-up. No ads. Guest links last 7 days; account links don&apos;t expire.</p>
                )}
              </div>

              {result && (
                <div className="h2-settle relative mt-1 rounded-md border border-dashed border-gray-400/60 bg-white px-4 py-3.5 text-left shadow-2xs">
                  <div className="mb-2 flex items-center gap-1.5 font-mono text-xs text-[var(--fg-2)]">
                    <span className="bg-accent flex size-4 items-center justify-center rounded-[4px] text-[var(--fg)]">
                      <CheckIcon size={10} weight="bold" />
                    </span>
                    Shortened
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href={`https://${result.short}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex min-w-0 items-center gap-1.5 rounded-sm font-mono text-base font-medium text-[var(--fg)] underline-offset-4 hover:underline",
                        FOCUS_RING,
                      )}
                    >
                      <span className="truncate">{result.short}</span>
                      <ArrowSquareOutIcon size={14} className="shrink-0 text-[var(--fg-3)]" />
                    </a>
                    <button
                      type="button"
                      onClick={copy}
                      className={cn(
                        "border-border inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-white px-2.5 text-xs font-medium text-[var(--fg)] shadow-xs transition-colors hover:bg-[oklch(0.96_0_0)]",
                        FOCUS_RING,
                      )}
                    >
                      {copied ? <CheckIcon size={13} weight="bold" /> : <CopyIcon size={13} />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-2 font-mono text-xs leading-5 text-[var(--fg-2)]">
                    Lasts 7 days, not monitored.{" "}
                    <Link href={SIGN_UP} className={cn("rounded-sm text-[var(--fg)] underline decoration-[var(--sig)] decoration-2 underline-offset-4", FOCUS_RING)}>
                      Sign up free
                    </Link>{" "}
                    to keep it and have it checked.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="h2-rise-block relative isolate mt-14 pb-24 lg:mt-16 lg:pb-32" style={delay(DELAY.pane)}>
            <GlassDashboard />
          </div>
        </section>

        <FeatureBento signedIn={signedIn} />

        <Statement />
        <Compare signedIn={signedIn} />
        <Faq />
      </main>

      <Closing signedIn={signedIn} />
    </div>
  );
}

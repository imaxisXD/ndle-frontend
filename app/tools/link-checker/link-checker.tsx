"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Script from "next/script";
import { ArrowRightIcon, CircleNotchIcon, LinkSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@ui/badge";
import type { LinkCheckResult } from "@/lib/link-check";
import { cn } from "@/lib/utils";
import { ActionLink, FOCUS } from "@/app/home-2/_components/kit";

/* The "Is this link working?" form. Cloudflare Turnstile runs in the
   background (it shows a challenge only when it isn't sure), and its token
   goes with the check to /api/tools/link-check. Tokens are single-use, so the
   widget resets after every check. */

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SIGN_UP = "/sign-up?redirect_url=/dashboard";

const VERDICT = {
  working: { label: "Working", variant: "green" },
  slow: { label: "Slow", variant: "yellow" },
  broken: { label: "Broken", variant: "red" },
  unclear: { label: "Couldn't tell", variant: "default" },
} as const;

function summary(result: LinkCheckResult) {
  const seconds = (result.totalMs / 1000).toFixed(1);
  if (result.error) return result.error;
  switch (result.verdict) {
    case "working":
      return `The page answered ${result.status} in ${result.totalMs} ms.`;
    case "slow":
      return `The page answered ${result.status}, but took ${seconds} seconds.`;
    case "broken":
      return result.status === 404 || result.status === 410
        ? `The page answered ${result.status}: it's missing.`
        : `The page answered ${result.status}, an error.`;
    case "unclear":
      return `The site answered ${result.status}, which usually means it blocks automated checks, not that the page is down. Open it in a browser to be sure.`;
  }
}

export function LinkChecker({ siteKey }: { siteKey: string }) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinkCheckResult | null>(null);

  const renderWidget = useCallback(() => {
    if (!siteKey || !window.turnstile || !widgetRef.current || widgetId.current) return;
    widgetId.current = window.turnstile.render(widgetRef.current, {
      sitekey: siteKey,
      appearance: "interaction-only",
      size: "flexible",
      action: "link-check",
      callback: (value: string) => setToken(value),
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }, [siteKey]);

  // The script may already be loaded when this mounts (client navigation).
  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [renderWidget]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("Paste a link first.");
      return;
    }
    if (!token) {
      setError("One moment: the security check is still running.");
      return;
    }
    setChecking(true);
    try {
      const response = await fetch("/api/tools/link-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, token }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResult(null);
        setError(typeof body.error === "string" ? body.error : "That check didn't go through. Try again.");
      } else {
        setResult(body as LinkCheckResult);
      }
    } catch {
      setError("That check didn't go through. Try again.");
    } finally {
      setChecking(false);
      setToken("");
      if (widgetId.current) window.turnstile?.reset(widgetId.current);
    }
  };

  if (!siteKey) {
    return <p className="font-mono text-sm text-[#3d3d3d]">The link checker isn&apos;t available right now.</p>;
  }

  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="check-url" className="sr-only">
          Link to check
        </label>
        <div
          className={cn(
            "flex h-11 min-w-0 items-center gap-2.5 rounded-md border bg-white px-3.5 shadow-xs transition-[border-color,box-shadow] duration-150 focus-within:border-[oklch(0.78_0.15_88)] focus-within:ring-[3px] focus-within:ring-[oklch(0.86_0.17_88/0.35)] sm:flex-1",
            error ? "border-red-400" : "border-border",
          )}
        >
          <LinkSimpleIcon size={17} className="shrink-0 text-[var(--fg-3)]" />
          <input
            id="check-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="Paste a link to check…"
            aria-invalid={error ? true : undefined}
            aria-describedby="check-note"
            disabled={checking}
            className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-3)] disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={checking}
          className={cn(
            "bg-accent text-accent-foreground hover:bg-accent/90 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-colors disabled:cursor-progress disabled:opacity-80",
            FOCUS,
          )}
        >
          {checking ? (
            <>
              <CircleNotchIcon size={16} className="animate-spin" />
              Checking…
            </>
          ) : (
            <>
              Check link
              <ArrowRightIcon size={16} />
            </>
          )}
        </button>
      </form>
      {/* Turnstile draws here only if it needs you to click. */}
      <div ref={widgetRef} className="mt-2 empty:hidden" />

      <div id="check-note" aria-live="polite" className="mt-3 min-h-5 font-mono text-xs">
        {error ? (
          <p className="flex items-start gap-1.5 text-red-700">
            <WarningCircleIcon size={15} className="mt-px shrink-0" />
            {error}
          </p>
        ) : (
          !result && <p className="text-[#3d3d3d]">Free. No sign-up.</p>
        )}
      </div>

      {result && (
        <div className="mt-2 border-2 border-[#141312] bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={VERDICT[result.verdict].variant} label={VERDICT[result.verdict].label} />
            <code className="min-w-0 truncate font-mono text-sm text-[#141312]">{result.finalUrl}</code>
          </div>
          <p className="mt-3 text-[15px] leading-6 text-[var(--fg-2)]">{summary(result)}</p>
          {result.hops.length > 1 && (
            <ol className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-4 font-mono text-xs text-[#3d3d3d]">
              {result.hops.map((hop, i) => (
                <li key={`${i}-${hop.url}`} className="flex items-center gap-3">
                  <span className="w-9 shrink-0 text-[#141312]">{hop.status}</span>
                  <span className="min-w-0 flex-1 truncate">{hop.url}</span>
                  <span className="shrink-0">{hop.ms} ms</span>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--line)] pt-4">
            <p className="text-sm text-[#141312]">Want to know if it breaks later? ndle checks every link every 30 minutes, free.</p>
            <ActionLink href={SIGN_UP}>Watch your links</ActionLink>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { ActionLink, FOCUS, Wordmark } from "./kit";
import { LedSign } from "./led-sign";

/* The close: black, white and yellow, like the dashboard's live counter
   panel. The headline is a dot-matrix sign that boots up and keeps watching,
   the actions sit under it, and the foot of the card carries the real click
   total when there is one. */

const ON_DARK = "focus-visible:ring-offset-[#121110]";

export function Closing({ signedIn }: { signedIn: boolean }) {
  const live = useQuery(api.publicStats.getLiveClickTotal);

  return (
    <>
      <section aria-labelledby="cta-title" className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8 lg:py-32">
        <div className="relative isolate overflow-hidden rounded-[20px] bg-[#121110] text-center shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_30px_60px_-30px_rgba(0,0,0,0.45)]">
          <div className="px-4 pt-10 sm:px-8 lg:px-12 lg:pt-14">
            <h2 id="cta-title" className="sr-only">
              Stop guessing. Start watching.
            </h2>
            <LedSign />
          </div>
          <div className="px-6 pt-8 pb-12 sm:px-12 lg:pt-10 lg:pb-14">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <ActionLink href={signedIn ? "/dashboard" : "/sign-up?redirect_url=/dashboard"} className={ON_DARK}>
                {signedIn ? "Open your dashboard" : "Get started free"}
              </ActionLink>
              {!signedIn && (
                <ActionLink href="/sign-in?redirect_url=/dashboard" tone="onDark" className={ON_DARK}>
                  Sign in
                </ActionLink>
              )}
            </div>
            {!signedIn && <p className="mt-4 font-mono text-xs text-white/40">Free plan. No card needed.</p>}
          </div>
          {live && (
            <div className="flex items-center justify-center gap-2 border-t border-dashed border-white/10 px-6 py-4 font-mono text-xs text-white/50">
              <span className="animate-live-blip size-1.5 rounded-full bg-green-500" />
              <span className="text-white/80 tabular-nums">{live.total.toLocaleString("en-US")}</span>
              clicks counted so far
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-dashed border-gray-400/60">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8 px-5 pt-12 pb-10 sm:px-8">
          <div className="space-y-2">
            <a href="#top" aria-label="ndle, back to top" className={cn("-m-1 inline-block rounded-sm p-1", FOCUS)}>
              <Wordmark className="text-[44px]" />
            </a>
            <p className="font-mono text-xs text-[var(--fg-3)]">Short. Sharp. Smarter.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm text-[var(--fg-2)]">
            {[
              { label: "Monitoring", href: "#top" },
              { label: "Analytics", href: "#analytics" },
              { label: "Collections", href: "#collections" },
              { label: "Free plan", href: "#pricing" },
            ].map((l) => (
              <a key={l.label} href={l.href} className={cn("rounded-sm hover:text-[var(--fg)]", FOCUS)}>
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-4 px-5 pb-8 font-mono text-xs text-[var(--fg-3)] sm:px-8">
          <span>
            © ndle · made by{" "}
            <a href="https://x.com/abhishk_084" target="_blank" rel="noopener noreferrer" className={cn("rounded-sm underline-offset-4 hover:underline", FOCUS)}>
              Abhishek
            </a>
          </span>
          <span className="flex gap-4">
            {[
              { label: "X", href: "https://x.com/abhishk_084" },
              { label: "LinkedIn", href: "https://www.linkedin.com/in/abhishek-ichi/" },
              { label: "GitHub", href: "https://github.com/imaxisXD" },
            ].map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className={cn("rounded-sm hover:text-[var(--fg)]", FOCUS)}>
                {l.label}
              </a>
            ))}
          </span>
        </div>
      </footer>
    </>
  );
}

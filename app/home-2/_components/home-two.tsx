"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useAuth } from "@clerk/nextjs";
import { makeShortLink } from "@/lib/config";
import { cn } from "@/lib/utils";
import { Closing } from "./closing";
import { Compare } from "./compare";
import { Faq } from "./faq";
import { FeatureBento } from "./feature-bento";
import { bebas } from "./fonts";
import { GlassDashboard } from "./glass-dashboard";
import { HeroShortener } from "./hero-shortener";
import { SiteNav } from "./site-nav";
import { Statement } from "./statement";
import type { YourLink } from "./your-link-pages";
import { YourLinkTakeover } from "./your-link-takeover";

/* ─────────────────────────────────────────────────────────
 * HERO STORYBOARD   (CSS, runs before hydration)
 *
 *     0ms   "Short"        rises out of blur
 *    70ms   "links,"
 *   260ms   "watched"      rises like the rest, in the page's tall capitals;
 *                          its full stop is a live yellow LED
 *   420ms   description    rises as one block
 *   540ms   form           rises as one block; what it does once a link is
 *                          sent is in hero-shortener.tsx
 *
 *   680ms   the dashboard rises behind glass; once it is on screen it
 *           plays a pass through the product (glass-dashboard.tsx), with
 *           chapters and Replay under it
 * ───────────────────────────────────────────────────────── */

const DELAY = { word: 70, watched: 260, copy: 420, form: 540, pane: 680 };

function delay(ms: number) {
  return { "--h2-delay": `${ms}ms` } as CSSProperties;
}

export function HomeTwo() {
  const { isSignedIn } = useAuth();
  const signedIn = !!isSignedIn;
  // The visitor's link, while it plays through the dashboard
  const [preview, setPreview] = useState<YourLink | null>(null);

  // Development: `?pass` opens the pass straight away with a sample link, to
  // look at it without shortening a link each time.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!new URLSearchParams(window.location.search).has("pass")) return;
    setPreview({
      short: makeShortLink("k3x9qa"),
      destination: "https://example.com/blog/spring-launch?utm_source=newsletter",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
  }, []);

  return (
    <>
      <div inert={!!preview} className={cn(bebas.variable, "h2-day h2-canvas min-h-dvh overflow-x-clip font-sans antialiased")}>
        <SiteNav />

        <main id="main">
          {/* ───────── Hero: day one, switched on ───────── */}
          <section
            id="top"
            aria-labelledby="hero-title"
            className="mx-auto max-w-[1240px] scroll-mt-20 px-5 pt-14 sm:px-8 lg:pt-20"
          >
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
                <HeroShortener onPass={setPreview} />
              </div>
            </div>

            <div className="h2-rise-block relative isolate mt-14 pb-24 lg:mt-16 lg:pb-32" style={delay(DELAY.pane)}>
              <GlassDashboard paused={!!preview} />
            </div>
          </section>

          <FeatureBento signedIn={signedIn} />

          <Statement />
          <Compare signedIn={signedIn} />
          <Faq />
        </main>

        <Closing signedIn={signedIn} />
      </div>
      {preview && <YourLinkTakeover link={preview} onClose={() => setPreview(null)} />}
    </>
  );
}

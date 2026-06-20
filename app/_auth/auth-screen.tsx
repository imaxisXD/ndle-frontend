import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";

import { NdleDotMatrix } from "@/components/ndle-dot-matrix";

type AuthScreenProps = {
  title: string;
  subtitle: string;
  switchText: string;
  switchHref: string;
  switchLabel: string;
  children: ReactNode;
};

export const authClerkAppearance = {
  layout: {
    socialButtonsVariant: "blockButton" as const,
    logoImageUrl: "",
  },
  elements: {
    rootBox: "mx-auto w-full bg-transparent",
    card:
      "mx-auto w-full border-0 bg-transparent shadow-none text-[color:var(--pulp-ink)]",
    header: "hidden",
    formFieldLabel:
      "text-[11px] font-bold tracking-[0.18em] uppercase text-[color:var(--pulp-ink)]/70",
    formFieldInput:
      "h-11 rounded-md border-2 border-[color:var(--pulp-ink)]/25 bg-white/80 font-mono text-[color:var(--pulp-ink)] shadow-none focus:border-[color:var(--pulp-orange)] focus:ring-[color:var(--pulp-orange)]",
    formFieldInputShowPasswordButton:
      "text-[color:var(--pulp-ink)]/55 hover:text-[color:var(--pulp-ink)]",
    socialButtons: "grid gap-3 sm:grid-cols-2",
    socialButton:
      "h-11 rounded-md border-2 border-[color:var(--pulp-ink)]/25 bg-white/70 font-mono text-[color:var(--pulp-ink)] shadow-none hover:border-[color:var(--pulp-ink)] hover:bg-[color:var(--pulp-yellow)]/35",
    dividerLine: "bg-[color:var(--pulp-ink)]/20",
    dividerText:
      "font-mono text-[10px] font-bold tracking-[0.24em] uppercase text-[color:var(--pulp-ink)]/45",
    formButtonPrimary:
      "h-11 rounded-md border-2 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-yellow)] font-mono text-xs font-bold tracking-[0.22em] text-[color:var(--pulp-ink)] uppercase shadow-[4px_4px_0_0_var(--pulp-ink)] transition hover:bg-[color:var(--pulp-orange)] hover:text-[color:var(--pulp-cream)] active:translate-x-px active:translate-y-px active:shadow-[2px_2px_0_0_var(--pulp-ink)]",
    footer: "hidden",
    identityPreviewText: "text-[color:var(--pulp-ink)]",
    formResendCodeLink: "text-[color:var(--poster)] hover:text-[color:var(--poster-deep)]",
    formFieldSuccessText: "text-[color:var(--telegram-green)]",
    formFieldErrorText: "text-[color:var(--telegram-red)]",
    alert: "border-2 border-[color:var(--telegram-red)]/35 bg-[color:var(--telegram-red)]/10 text-[color:var(--pulp-ink)]",
  },
};

const dotPalette = {
  on: "var(--pulp-yellow)",
  off: "rgba(255, 244, 210, 0.2)",
};

function RatingStamp() {
  return (
    <div className="inline-flex items-stretch border border-[color:var(--pulp-ink)] text-[color:var(--pulp-ink)]">
      <div className="flex items-center justify-center border-r border-[color:var(--pulp-ink)] px-3 py-2">
        <span className="font-sigmar text-2xl leading-none italic">N</span>
      </div>
      <div className="flex flex-col justify-between py-1.5">
        <span className="border-b border-[color:var(--pulp-ink)] px-2.5 py-0.5 text-[8px] font-bold tracking-[0.2em] uppercase">
          ndle live
        </span>
        <span className="px-2.5 py-0.5 text-[8px] font-semibold tracking-[0.15em] uppercase">
          link monitor
          <br />
          every 60 seconds
        </span>
      </div>
    </div>
  );
}

function SideStamp() {
  return (
    <div className="hidden flex-col items-end gap-1 text-[color:var(--pulp-ink)] sm:inline-flex">
      <div className="text-[9px] font-bold tracking-[0.22em] uppercase">
        free plan
      </div>
      <div
        className="flex items-center justify-center border border-[color:var(--pulp-ink)] px-3 py-1 text-[9px] font-bold tracking-[0.25em] uppercase"
        style={{ borderRadius: "50% / 60%" }}
      >
        100 links
      </div>
      <div className="text-right text-[8px] font-semibold tracking-[0.2em] uppercase">
        no card
      </div>
    </div>
  );
}

function CuttingMatBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 opacity-45"
      style={{
        backgroundImage: `
          linear-gradient(45deg, transparent 49.7%, rgba(255,255,255,0.08) 49.7%, rgba(255,255,255,0.08) 50.3%, transparent 50.3%),
          linear-gradient(-45deg, transparent 49.7%, rgba(255,255,255,0.06) 49.7%, rgba(255,255,255,0.06) 50.3%, transparent 50.3%),
          linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px),
          linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
        `,
        backgroundSize:
          "100% 100%, 100% 100%, 96px 96px, 96px 96px, 24px 24px, 24px 24px",
      }}
    />
  );
}

export function AuthScreen({
  title,
  subtitle,
  switchText,
  switchHref,
  switchLabel,
  children,
}: AuthScreenProps) {
  return (
    <main className="paper-grain relative min-h-[100svh] overflow-hidden bg-[color:var(--poster)] font-mono text-[color:var(--pulp-cream)]">
      <CuttingMatBackground />
      <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full border-[32px] border-[color:var(--pulp-yellow)]/25" />
      <div className="absolute right-[-8rem] bottom-[-9rem] h-96 w-96 rotate-12 border-[24px] border-[color:var(--pulp-orange)]/25" />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-3"
          aria-label="Back to ndle home"
        >
          <NdleDotMatrix
            rows={7}
            cols={18}
            size={3.5}
            gap={1.5}
            palette={dotPalette}
          />
          <span className="hidden text-[10px] font-bold tracking-[0.3em] text-[color:var(--pulp-cream)]/70 uppercase sm:inline">
            / link monitor
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-[color:var(--pulp-cream)]/75 uppercase transition hover:text-[color:var(--pulp-yellow)]"
        >
          <ArrowLeftIcon className="size-3.5" />
          Home
        </Link>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100svh-88px)] max-w-7xl items-center gap-10 px-5 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] lg:px-8 lg:pb-16">
        <div className="hidden max-w-3xl lg:block">
          <div className="mb-10 flex items-start justify-between gap-5">
            <div className="bg-[color:var(--pulp-cream)]/95">
              <RatingStamp />
            </div>
            <div className="bg-[color:var(--pulp-cream)]/95 px-3 py-2">
              <SideStamp />
            </div>
          </div>

          <p className="mb-3 text-[11px] font-bold tracking-[0.42em] text-[color:var(--pulp-cream)]/80 uppercase">
            a{" "}
            <span className="font-sigmar text-[15px] tracking-normal text-[color:var(--pulp-yellow)] italic">
              ndle
            </span>{" "}
            production
          </p>
          <h1 className="font-sigmar text-pulp max-w-[720px] text-[clamp(4.6rem,8vw,8.5rem)] leading-[0.88] text-[color:var(--pulp-yellow)] italic">
            Link Monitor
          </h1>
          <p className="mt-7 max-w-xl text-sm font-bold tracking-[0.28em] text-[color:var(--pulp-cream)]/85 uppercase">
            Short links that tell you when they break.
          </p>
        </div>

        <div className="mx-auto w-full max-w-[460px]">
          <div className="mb-4 flex items-center justify-between gap-4 lg:hidden">
            <div className="bg-[color:var(--pulp-cream)]/95">
              <RatingStamp />
            </div>
            <span className="font-sigmar text-3xl leading-none text-[color:var(--pulp-yellow)] italic">
              ndle
            </span>
          </div>

          <div className="relative border-2 border-[color:var(--pulp-ink)] bg-[color:var(--pulp-cream)] p-4 text-[color:var(--pulp-ink)] shadow-[8px_8px_0_0_var(--pulp-ink)] sm:p-6">
            <div className="mb-6 border-b-2 border-[color:var(--pulp-ink)]/20 pb-5">
              <p className="mb-2 text-[10px] font-bold tracking-[0.3em] text-[color:var(--pulp-orange)] uppercase">
                account access
              </p>
              <h2 className="font-sigmar text-3xl leading-none italic sm:text-4xl">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[color:var(--pulp-ink)]/70">
                {subtitle}
              </p>
            </div>

            {children}

            <div className="mt-6 border-t-2 border-[color:var(--pulp-ink)]/15 pt-5 text-center text-sm text-[color:var(--pulp-ink)]/65">
              {switchText}{" "}
              <Link
                href={switchHref}
                className="font-bold text-[color:var(--poster)] underline decoration-[color:var(--pulp-orange)] decoration-2 underline-offset-4 hover:text-[color:var(--poster-deep)]"
              >
                {switchLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

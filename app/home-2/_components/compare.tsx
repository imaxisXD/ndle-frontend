"use client";

import { useQuery } from "convex/react";
import { CheckIcon, TagIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { COUNTER_TEXTURE } from "@/components/charts/live-click-hero";
import { LiveDot } from "@/components/ui/live-dot";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { ActionLink, INK_TITLE, InkBadge } from "./kit";

/* Competitor facts carried over from the current home page (public plans,
   April 2026). ndle's rows claim only what ships (docs/feature-status.md). */

type Value = string | boolean;

const ROWS: Array<{
  label: string;
  ndle: Value;
  bitly: Value;
  dub: Value;
  shortio: Value;
  only?: boolean;
}> = [
  { label: "Free short links", ndle: "100 active", bitly: "5 a month", dub: "25 a month", shortio: "1,000*" },
  { label: "Custom domains", ndle: "1", bitly: false, dub: "3", shortio: "5" },
  { label: "QR codes", ndle: "Unlimited", bitly: "2 / mo", dub: true, shortio: true },
  { label: "Broken-link checks", ndle: true, bitly: false, dub: false, shortio: false, only: true },
  { label: "Uptime history per link", ndle: true, bitly: false, dub: false, shortio: false, only: true },
  { label: "No ad page before the link", ndle: true, bitly: false, dub: true, shortio: true },
];

const ALSO = ["UTM builder", "Saved UTM templates", "Link expiry dates", "Collections", "Analytics by country, device and referrer"];

const PLANS = [
  { key: "ndle", name: "ndle" },
  { key: "bitly", name: "Bitly" },
  { key: "dub", name: "Dub" },
  { key: "shortio", name: "Short.io" },
] as const;

type PlanKey = (typeof PLANS)[number]["key"];

/* Every plan here is a free one, so the cards show no price: the section's
   title says it, and each card's "Free plan" line. */
const FEATURES = ROWS;

/* The plans, after capy.ai's Pricing: a centred head, a black banner with
   the offer, then one ink card per free plan. ndle's card is the inverted
   one, as capy's featured plan is, with yellow checks where no other free
   plan has the feature. The banner carries the real click total when there
   is one. */
export function Compare({ signedIn = false }: { signedIn?: boolean }) {
  const live = useQuery(api.publicStats.getLiveClickTotal);

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 py-24 sm:px-8 lg:py-28">
      <div className="flex flex-col items-center text-center">
        <InkBadge>
          <TagIcon size={30} weight="bold" />
        </InkBadge>
        <h2 id="pricing-title" className={cn(INK_TITLE, "mt-5")}>
          Free plan, compared
        </h2>
        <p className="mt-4 font-mono text-[17px] leading-[1.45] text-[#141312]">Broken-link checks, free.</p>
      </div>

      {/* The offer, on the Live Click Counter's black with its faint white
          checker across the whole card. */}
      <div
        className="mt-12 flex flex-col gap-8 border-2 border-[#141312] bg-black px-7 py-9 text-white sm:px-10 lg:flex-row lg:items-center lg:justify-between"
        style={COUNTER_TEXTURE}
      >
        <div>
          <p className="font-[family-name:var(--font-bebas)] text-[clamp(2.5rem,4.6vw,3.5rem)] leading-[0.92] uppercase">
            100 links free.
            <span className="block text-[var(--sig)]">Every one checked.</span>
          </p>
          <p className="mt-4 max-w-[46ch] font-mono text-[15px] leading-[1.5] text-white/75">
            The free plan has 100 active links, 1 custom domain and unlimited QR codes, and every link is checked every
            30 minutes. No card needed.
          </p>
          <ActionLink href={signedIn ? "/dashboard" : "/sign-up?redirect_url=/dashboard"} className="mt-6 focus-visible:ring-offset-black">
            {signedIn ? "Open your dashboard" : "Get ndle free"}
          </ActionLink>
        </div>
        {/* The real click total, live; until there is one, the offer's number.
            Captioned the counter's way: yellow, in brackets. */}
        <div className="shrink-0 lg:text-right">
          <p className="font-doto roundness-100 text-[clamp(3rem,6vw,4.75rem)] leading-none font-black text-white/90 tabular-nums">
            {live ? live.total.toLocaleString("en-US") : "100"}
          </p>
          <p className="mt-3 flex items-center gap-2 font-mono text-xs text-[var(--sig)] lg:justify-end">
            {live ? (
              <>
                <LiveDot />
                [clicks counted on ndle]
              </>
            ) : (
              "[free links, every one checked]"
            )}
          </p>
        </div>
      </div>

      {/* One card per free plan */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <Plan key={plan.key} plan={plan.key} name={plan.name} />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 font-mono text-xs text-[#3d3d3d] sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-[70ch] leading-5">
          <span className="text-[#141312]">On every plan:</span> {ALSO.join(", ")}.
        </p>
        <p className="shrink-0 sm:text-right">
          <span className="bg-accent mr-1.5 inline-block size-1.5 rounded-full align-middle" />
          No other free plan includes it.
          <br />* Short.io caps at 50k tracked clicks/mo · public plans, April 2026
        </p>
      </div>
    </section>
  );
}

function Plan({ plan, name }: { plan: PlanKey; name: string }) {
  const ours = plan === "ndle";
  return (
    <article
      aria-label={`${name} free plan`}
      className={cn("flex flex-col border-2 border-[#141312] p-6", ours ? "bg-[#141312] text-white" : "bg-white text-[#141312]")}
    >
      <div className="flex items-center gap-2">
        {ours ? (
          <h3 className="font-doto roundness-100 text-[26px] leading-none font-black">ndle</h3>
        ) : (
          <h3 className="font-[family-name:var(--font-bebas)] text-[28px] leading-none uppercase">{name}</h3>
        )}
      </div>
      <p className={cn("mt-1 font-mono text-xs", ours ? "text-white/55" : "text-[#6b6b6b]")}>Free plan</p>

      <ul className="mt-6 space-y-3 font-mono text-[13px] leading-5">
        {FEATURES.map((row) => {
          const value = row[plan];
          const has = value !== false;
          return (
            <li key={row.label} className={cn("flex items-start gap-2.5", !has && (ours ? "text-white/40" : "text-[#9a9a9a]"))}>
              <Mark has={has} ours={ours} only={ours && !!row.only} />
              <span className="min-w-0 flex-1">
                {row.label}
                {typeof value === "string" && (
                  <span className={cn("block font-medium", ours ? "text-white" : "text-[#141312]")}>{value}</span>
                )}
                {!has && <span className="sr-only"> (not included)</span>}
                {ours && row.only && <span className="sr-only"> (no other free plan includes it)</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {/* ndle's benefit, said plainly and pinned to the foot of its card, so
          the four feature lists stay level. The LED is the hero's. */}
      {ours && (
        <div className="mt-auto pt-6">
          <p className="flex items-start gap-3 border-t border-white/15 pt-4 font-mono text-[13px] leading-5">
            <span aria-hidden className="h2-led mt-[6px] ml-0 shrink-0 text-[48px]" />
            <span>
              <span className="block font-medium text-white">Watches every link</span>
              <span className="text-white/60">Checked every 30 minutes.</span>
            </span>
          </p>
        </div>
      )}
    </article>
  );
}

function Mark({ has, ours, only }: { has: boolean; ours: boolean; only: boolean }) {
  if (!has) return <XIcon aria-hidden size={14} weight="bold" className="mt-[3px] shrink-0" />;
  return (
    <span
      aria-hidden
      className={cn(
        "mt-px inline-flex size-[18px] shrink-0 items-center justify-center rounded-full",
        only ? "bg-accent text-[#141312]" : ours ? "bg-white/12 text-white" : "bg-[#141312] text-white",
      )}
    >
      <CheckIcon size={11} weight="bold" />
    </span>
  );
}

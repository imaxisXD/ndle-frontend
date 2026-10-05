"use client";

import { CheckIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { COUNTER_TEXTURE } from "@/components/charts/live-click-hero";
import { cn } from "@/lib/utils";
import { TagDoodle } from "./dot-doodles";
import { ActionLink, ByAuth, CUT_FROM_LG, INK_TITLE, cutStyle, slantedCut, type Auth } from "./kit";

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

const ALSO = [
  "UTM builder",
  "Saved UTM templates",
  "Link expiry dates",
  "Collections",
  "Analytics by country, device and referrer",
];

/* The banner's right side: the offer's own numbers. */
const FIGURES = [
  { value: "100", label: "active links" },
  { value: "1", label: "custom domain" },
  { value: "30", label: "minutes between checks" },
];

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
   plan has the feature. From lg, where they stand side by side, the cards
   are cut like a row of the bento's panels: every gutter leaning the same
   way, as the bento's last row leans, so the row reads as one sheared
   strip. */

/* Side by side: gutters CUT.gap px wide, leaning CUT.slant px over a card's
   height; each card's box reaches CUT.reach px into its neighbour's. */
const CUT = { gap: 22, slant: 40, reach: 9 }; // reach: (slant - gap) / 2
export function Compare({ auth }: { auth: Auth }) {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="mx-auto max-w-[1240px] scroll-mt-20 px-5 py-24 sm:px-8 lg:py-28"
    >
      <div className="flex flex-col items-center text-center">
        {/* The drawing on the title's line, leading into it */}
        <div className="flex items-center gap-3">
          <TagDoodle color="green" className="size-12 shrink-0 sm:size-14" />
          <h2 id="pricing-title" className={INK_TITLE}>
            Free plan, compared
          </h2>
        </div>
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
            The free plan has 100 active links, 1 custom domain and unlimited QR codes, and every link is checked every 30
            minutes. No card needed.
          </p>
          <ByAuth
            auth={auth}
            className="mt-6"
            signedOut={(link) => (
              <ActionLink href="/sign-up?redirect_url=/dashboard" className="focus-visible:ring-offset-black" {...link}>
                Get ndle free
              </ActionLink>
            )}
            signedIn={(link) => (
              <ActionLink href="/dashboard" className="focus-visible:ring-offset-black" {...link}>
                Open your dashboard
              </ActionLink>
            )}
          />
        </div>
        {/* Captioned the counter's way: yellow, in brackets. */}
        <ul aria-label="The free plan" className="grid shrink-0 grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-5 lg:text-right">
          {FIGURES.map((figure) => (
            <li key={figure.label}>
              <span className="font-doto roundness-100 block text-[clamp(2.25rem,4vw,3.25rem)] leading-none font-black text-white/90 tabular-nums">
                {figure.value}
              </span>
              <span className="mt-2 block font-mono text-xs text-[var(--sig)]">[{figure.label}]</span>
            </li>
          ))}
        </ul>
      </div>

      {/* One card per free plan */}
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0">
        {PLANS.map((plan, i) => (
          <Plan key={plan.key} plan={plan.key} name={plan.name} index={i} />
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

function Plan({ plan, name, index }: { plan: PlanKey; name: string; index: number }) {
  const ours = plan === "ndle";
  const first = index === 0;
  const last = index === PLANS.length - 1;
  return (
    <article
      aria-label={`${name} free plan`}
      // Reaching into each neighbour, so the cut leaves a gutter CUT.gap wide
      className={cn(CUT_FROM_LG.outer, !first && "lg:-ml-[9px]", !last && "lg:-mr-[9px]")}
      style={cutStyle(slantedCut(index, PLANS.length, CUT.slant, "across", { parallel: true, flip: true }))}
    >
      <div
        className={cn(
          CUT_FROM_LG.inner,
          // Clear of the slant on the cut sides: the slant, and room to breathe
          "flex flex-col p-6",
          !first && "lg:pl-12",
          !last && "lg:pr-12",
          ours ? "bg-[#141312] text-white" : "bg-white text-[#141312]",
        )}
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
              <li key={row.label} className={cn("flex items-start gap-2.5", !has && (ours ? "text-white/40" : "text-[#767676]"))}>
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
      </div>
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

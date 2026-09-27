import { CheckIcon, MinusIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/* Plan and competitor facts carried over verbatim from the current home page
   (public plans, April 2026). Update both pages together. */

type Value = string | boolean;

const ROWS: Array<{
  label: string;
  ndle: Value;
  bitly: Value;
  dub: Value;
  shortio: Value;
  only?: boolean;
}> = [
  { label: "Price to start", ndle: "Free", bitly: "Free", dub: "Free", shortio: "Free" },
  { label: "Short links / month", ndle: "100", bitly: "5", dub: "25", shortio: "1,000*" },
  { label: "Custom domains", ndle: "1", bitly: false, dub: "3", shortio: "5" },
  { label: "QR codes", ndle: "Unlimited", bitly: "2 / mo", dub: true, shortio: true },
  { label: "Uptime monitoring", ndle: true, bitly: false, dub: false, shortio: false, only: true },
  { label: "Breakage alerts", ndle: true, bitly: false, dub: false, shortio: false, only: true },
  { label: "Chat with analytics", ndle: true, bitly: false, dub: "partial", shortio: false },
];

const ALSO = ["API access", "UTM builder", "Link tags", "Password links", "Webhooks", "CSV export", "Team-ready"];

function Cell({ value, ours, only }: { value: Value; ours?: boolean; only?: boolean }) {
  if (ours) {
    if (value === true)
      return (
        <span className="inline-flex items-center gap-2 font-medium text-white">
          <span
            className={cn(
              "inline-flex size-5 items-center justify-center rounded-full",
              only ? "bg-accent text-black" : "bg-white/12 text-white",
            )}
          >
            <CheckIcon size={12} weight="bold" />
          </span>
          Yes
        </span>
      );
    return <span className="font-medium text-white tabular-nums">{value}</span>;
  }
  if (value === true)
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--fg-2)]">
        <CheckIcon size={14} weight="bold" />
        Yes
      </span>
    );
  if (value === false)
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--fg-3)]">
        <XIcon size={13} weight="bold" />
        No
      </span>
    );
  if (value === "partial")
    return (
      <span className="inline-flex items-center gap-1.5 text-[var(--fg-3)]">
        <MinusIcon size={13} weight="bold" />
        Partial
      </span>
    );
  return <span className="text-[var(--fg-2)] tabular-nums">{value}</span>;
}

/* ndle's column is the one black stripe in a white table: white type,
   yellow checks where no other free plan has the feature. */
const OURS = "bg-[#151412]";

export function Compare() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 py-24 sm:px-8 lg:py-28">
      <h2 id="pricing-title" className="text-[clamp(1.9rem,3.2vw,2.5rem)] leading-[1.1] font-medium tracking-[-0.025em]">
        <span className="text-[var(--fg)]">Free plan, compared.</span>
        <span className="block text-[var(--fg-3)]">Monitoring and alerts, free.</span>
      </h2>

      <div className="mt-12">
        <p className="mb-2 text-xs text-[var(--fg-3)] sm:hidden">Swipe to see Bitly, Dub and Short.io.</p>
        <div className="border-border overflow-x-auto rounded-md border bg-white shadow-xs">
          <table className="w-full min-w-[620px] border-collapse text-left text-sm">
            <caption className="sr-only">Free plans of ndle, Bitly, Dub, and Short.io compared</caption>
            <thead>
              <tr className="font-mono text-xs tracking-[0.06em] text-[var(--fg-3)] uppercase">
                <th scope="col" className="sticky left-0 z-10 w-[30%] border-b border-[var(--line)] bg-white px-5 py-4 font-normal">
                  Feature
                </th>
                <th scope="col" className={cn(OURS, "w-[20%] border-b border-white/10 px-5 py-4 font-normal normal-case")}>
                  <span className="font-doto roundness-100 font-black inline-flex items-center gap-1.5 text-xl leading-none tracking-normal text-white">
                    ndle
                    <span aria-hidden className="bg-accent size-1.5 rounded-full" />
                  </span>
                </th>
                <th scope="col" className="border-b border-[var(--line)] px-5 py-4 font-normal">Bitly</th>
                <th scope="col" className="border-b border-[var(--line)] px-5 py-4 font-normal">Dub</th>
                <th scope="col" className="border-b border-[var(--line)] px-5 py-4 font-normal">Short.io</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => {
                const last = i === ROWS.length - 1;
                const rule = last ? "" : "border-b border-[var(--line)]";
                return (
                  <tr key={row.label}>
                    <th scope="row" className={cn("sticky left-0 z-10 bg-white px-5 py-4 font-normal text-[var(--fg)]", rule)}>
                      <span className="inline-flex items-center gap-2">
                        {row.label}
                        {row.only && (
                          <>
                            <span aria-hidden className="bg-accent size-1.5 rounded-full" />
                            <span className="sr-only">(no other free plan includes it)</span>
                          </>
                        )}
                      </span>
                    </th>
                    <td className={cn(OURS, "px-5 py-4", !last && "border-b border-white/10")}>
                      <Cell value={row.ndle} ours only={row.only} />
                    </td>
                    <td className={cn("px-5 py-4", rule)}>
                      <Cell value={row.bitly} />
                    </td>
                    <td className={cn("px-5 py-4", rule)}>
                      <Cell value={row.dub} />
                    </td>
                    <td className={cn("px-5 py-4", rule)}>
                      <Cell value={row.shortio} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 text-xs text-[var(--fg-3)] sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-[70ch] leading-5">
          <span className="text-[var(--fg-2)]">On every plan:</span> {ALSO.join(", ")}.
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

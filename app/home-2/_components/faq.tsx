import { cn } from "@/lib/utils";
import { AskDoodle } from "./dot-doodles";
import { CUT_BEHIND, INK_TITLE, cutStyle, slantedCut } from "./kit";

/* The questions people search for, answered plainly. Answers promise only what
   ships (docs/feature-status.md); the alert answer assumes owner emails ship
   before this page replaces `/`. page.tsx reuses FAQ for its FAQPage data. */

export const FAQ = [
  {
    q: "Is ndle free?",
    a: "Yes. The free plan has 100 active links, 1 custom domain and unlimited QR codes, and every link is checked every 30 minutes. No card needed.",
  },
  {
    q: "Do ndle links expire?",
    a: "Not unless you give one an expiry date. Links on a free account keep working. Guest links, made without an account, last 7 days.",
  },
  {
    q: "Are there ads on ndle links?",
    a: "No. A click goes straight to your page, with no ad or preview page in between.",
  },
  {
    q: "How often does ndle check my links?",
    a: "Every 30 minutes. When a check fails, ndle emails you, and emails again once the link works.",
  },
  {
    q: "What counts as a broken link?",
    a: "A page that's gone (404 or 410), a server error, a timeout or failed connection, or a broken SSL certificate. Slow responses are flagged too.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes. The free plan includes one custom domain, like go.yourbrand.com.",
  },
  {
    q: "Do ndle QR codes stop working?",
    a: "No. A ndle QR code opens your short link, so it keeps working as long as the link does. There's no trial to run out.",
  },
] as const;

/* Laid out after capy.ai's Enterprise section: the title held on the left
   while the answers pass on the right, one ink card each, stacked like the
   bento's panels: cut on a slant where they meet, the gutters leaning
   alternately. Every answer stays in the page, open, for readers and for
   search. */

/* Stacked: gutters CUT.gap px tall, leaning CUT.slant px across a card;
   each card's box reaches CUT.reach px into its neighbour's. */
const CUT = { gap: 16, slant: 20, reach: 2 }; // reach: (slant - gap) / 2

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 sm:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          {/* The drawing on the title's line, leading into it */}
          <div className="flex items-center gap-3">
            <AskDoodle color="violet" className="size-12 shrink-0 sm:size-14" />
            <h2 id="faq-title" className={INK_TITLE}>
              Questions, answered
            </h2>
          </div>
        </div>
        <dl className="flex flex-col">
          {FAQ.map(({ q, a }, i) => (
            <div
              key={q}
              // Reaching into each neighbour, so the cut leaves a gutter CUT.gap
              // tall, and clear of the slant at the cut edges
              className={cn(CUT_BEHIND, "px-6 py-8 sm:px-7", i > 0 && "-mt-[2px]", i < FAQ.length - 1 && "-mb-[2px]")}
              style={cutStyle(slantedCut(i, FAQ.length, CUT.slant, "down"))}
            >
              <dt className="font-[family-name:var(--font-bebas)] text-[28px] leading-[1] text-[#141312] uppercase">{q}</dt>
              <dd className="mt-2.5 max-w-[60ch] font-mono text-[15px] leading-[1.5] text-[#3d3d3d]">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

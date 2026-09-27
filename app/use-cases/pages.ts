import type { MDXContent } from "mdx/types";

/* Use-case pages: ndle for one kind of link. The body is an MDX file in
   content/use-cases; this list holds the page's search copy, hero and
   questions. pages.test.ts checks each page's sections against its MDX
   headings. Claims about ndle follow docs/feature-status.md. */

export type UseCasePage = {
  slug: string;
  /** Short name for the eyebrow, e.g. "QR codes". */
  topic: string;
  /** <title>, without the " | ndle" suffix. */
  title: string;
  /** Meta description. Keep it under 155 characters. */
  description: string;
  h1: string;
  lede: string;
  /** YYYY-MM-DD: when the page was last checked against the product. */
  updated: string;
  sections: Array<{ id: string; title: string }>;
  faq: Array<{ q: string; a: string }>;
  load: () => Promise<{ default: MDXContent }>;
};

// The same answer as the comparison pages and the landing page's FAQ.
const FREE_ANSWER =
  "Yes. The free plan has 100 active links, 1 custom domain and unlimited QR codes, and every link is checked every 30 minutes. No card needed.";

export const USE_CASES: UseCasePage[] = [
  {
    slug: "qr-codes",
    topic: "QR codes",
    title: "Free QR codes that keep working, with no scan limit",
    description:
      "Free, unlimited QR codes with no trial, no scan limit and no ad page. ndle checks the page behind every code every 30 minutes, so you know when one breaks.",
    h1: "QR codes that don't stop working",
    lede: "Unlimited QR codes on the free plan, with no trial to run out and no ad page in front. And a check on the page behind every code every 30 minutes.",
    updated: "2026-09-28",
    sections: [
      { id: "why-printed-qr-codes-stop-working", title: "Why printed QR codes stop working" },
      { id: "how-ndle-qr-codes-work", title: "How ndle QR codes work" },
      { id: "know-when-the-page-behind-it-breaks", title: "Know when the page behind it breaks" },
      { id: "what-ndle-doesnt-do-yet", title: "What ndle doesn't do yet" },
    ],
    faq: [
      {
        q: "Are ndle QR codes free?",
        a: "Yes. Every ndle link comes with a QR code, and the free plan has no limit on how many you make. Download them as SVG or PNG.",
      },
      {
        q: "Do ndle QR codes expire?",
        a: "No. A code opens its short link, and links on a free account don't expire unless you give them an end date.",
      },
      {
        q: "Is there a scan limit?",
        a: "No. ndle doesn't cap scans, and every scan counts as a click in your stats.",
      },
      {
        q: "Can I change where a printed code goes?",
        a: "Not yet. Point the code at a page you control, and if that page moves, redirect its old address to the new one.",
      },
    ],
    load: () => import("@/content/use-cases/qr-codes.mdx"),
  },
  {
    slug: "link-in-bio",
    topic: "Link in bio",
    title: "Link shortener for your Instagram bio",
    description:
      "A short link for your bio that you know is working: ndle checks it every 30 minutes, counts every tap and fits your own domain. Free for 100 active links.",
    h1: "A bio link you know is working",
    lede: "Short, counted and checked every 30 minutes, on your own domain if you like. Free for up to 100 active links.",
    updated: "2026-09-28",
    sections: [
      { id: "why-bio-links-go-stale", title: "Why bio links go stale" },
      { id: "what-ndle-does-for-a-bio-link", title: "What ndle does for a bio link" },
      { id: "five-links-one-bio", title: "Five links, one bio" },
      { id: "what-ndle-isnt", title: "What ndle isn't" },
    ],
    faq: [
      {
        q: "Can I use ndle links in my Instagram bio?",
        a: "Yes. An ndle link works anywhere a web link does: your bio, your other bio links, stories and posts.",
      },
      {
        q: "Is ndle a Linktree alternative?",
        a: "Not exactly. ndle doesn't make a page of buttons. It makes short links you can put in your bio or on the bio page you already use, and it checks each one every 30 minutes.",
      },
      {
        q: "How do I see which clicks came from Instagram?",
        a: "ndle breaks clicks down by referrer and UTM campaign. Tag the link with utm_source=instagram to make Instagram traffic easy to pick out.",
      },
      { q: "Is ndle free?", a: FREE_ANSWER },
    ],
    load: () => import("@/content/use-cases/link-in-bio.mdx"),
  },
];

export function getUseCase(slug: string): UseCasePage | undefined {
  return USE_CASES.find((page) => page.slug === slug);
}

export function urlForUseCase(slug: string) {
  return `https://ndle.app/use-cases/${slug}`;
}

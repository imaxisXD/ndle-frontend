import type { MDXContent } from "mdx/types";

/* Comparison pages ("X alternative"), one per competitor. The body is an MDX
   file in content/alternatives; this list holds the page's search copy, its
   hero, its questions (rendered and sent as FAQPage data) and the date its
   competitor facts were checked. pages.test.ts checks each page's sections
   against its MDX headings. Claims about ndle follow docs/feature-status.md. */

export type AlternativePage = {
  slug: string;
  competitor: string;
  /** <title>, without the " | ndle" suffix. */
  title: string;
  /** Meta description. Keep it under 155 characters. */
  description: string;
  h1: string;
  /** The line under the title. */
  lede: string;
  /** YYYY-MM-DD: when the competitor's facts were read from its own pages. */
  checked: string;
  sections: Array<{ id: string; title: string }>;
  faq: Array<{ q: string; a: string }>;
  load: () => Promise<{ default: MDXContent }>;
};

// The same answer on every page, so it can't drift from the landing page's FAQ.
const FREE_ANSWER =
  "Yes. The free plan has 100 active links, 1 custom domain and unlimited QR codes, and every link is checked every 30 minutes. No card needed.";

export const ALTERNATIVES: AlternativePage[] = [
  {
    slug: "bitly",
    competitor: "Bitly",
    title: "Free Bitly alternative with no ads and 100 links",
    description:
      "ndle is a free Bitly alternative: 100 active links, 1 custom domain and unlimited QR codes, with no ad page, and a check on every link every 30 minutes.",
    h1: "A free Bitly alternative that checks your links",
    lede: "100 active links, a custom domain and unlimited QR codes on the free plan. No ad page before your links, and a check on every one of them every 30 minutes.",
    checked: "2026-09-28",
    sections: [
      { id: "ndle-and-bitlys-free-plans-side-by-side", title: "ndle and Bitly's free plans, side by side" },
      { id: "why-people-look-for-a-bitly-alternative", title: "Why people look for a Bitly alternative" },
      { id: "where-bitly-is-ahead", title: "Where Bitly is ahead" },
      { id: "moving-from-bitly", title: "Moving from Bitly" },
    ],
    faq: [
      { q: "Is ndle really free?", a: FREE_ANSWER },
      {
        q: "Does ndle show an ad before my link opens?",
        a: "No. A click goes straight to your page, with no ad or preview page in between.",
      },
      {
        q: "Will my Bitly links stop working if I switch?",
        a: "Not because you switch. Bitly says links on bit.ly keep working even after an account is deleted. Links on a domain Bitly gave you stop when that domain's registration lapses.",
      },
      {
        q: "Can I import my Bitly links into ndle?",
        a: "Not yet. Create ndle links for new campaigns, and move the ones that matter as you update them.",
      },
    ],
    load: () => import("@/content/alternatives/bitly.mdx"),
  },
  {
    slug: "google-url-shortener",
    competitor: "goo.gl",
    title: "goo.gl alternative: replace your Google short links",
    description:
      "Google's URL shortener is closed and inactive goo.gl links stopped working in August 2025. Which ones still work, and how to replace the rest for good.",
    h1: "A goo.gl alternative for links that need to last",
    lede: "Google's shortener is closed, and inactive goo.gl links stopped working on 25 August 2025. Here's what still works, how to replace the rest, and what to look for next time.",
    checked: "2026-09-28",
    sections: [
      { id: "which-googl-links-still-work", title: "Which goo.gl links still work" },
      { id: "replace-a-dead-googl-link", title: "Replace a dead goo.gl link" },
      { id: "what-to-look-for-in-a-replacement", title: "What to look for in a replacement" },
      { id: "how-ndle-compares", title: "How ndle compares" },
    ],
    faq: [
      {
        q: "Can I still create goo.gl links?",
        a: "No. New users couldn't create them from April 2018, and Google turned the console and API off on 30 March 2019.",
      },
      {
        q: "Will my other goo.gl links stop working too?",
        a: "Google says it is preserving actively used links. Only links that showed its warning page, after no activity in late 2024, stopped on 25 August 2025.",
      },
      {
        q: "Can I get a dead goo.gl link back?",
        a: "No. The short link can't be revived or edited. Make a new link and put it everywhere the old one appeared.",
      },
      { q: "Is ndle free?", a: FREE_ANSWER },
    ],
    load: () => import("@/content/alternatives/google-url-shortener.mdx"),
  },
  {
    slug: "tinyurl",
    competitor: "TinyURL",
    title: "Free TinyURL alternative with click stats",
    description:
      "TinyURL's free plan has no click stats and no own domain. ndle's free plan has both, plus 100 active links and a check on every link every 30 minutes.",
    h1: "A TinyURL alternative that shows you your clicks",
    lede: "Click stats, your own domain and unlimited QR codes on the free plan, and a check on the page behind every link every 30 minutes.",
    checked: "2026-09-28",
    sections: [
      { id: "ndle-and-tinyurls-free-plans-side-by-side", title: "ndle and TinyURL's free plans, side by side" },
      { id: "why-people-look-for-a-tinyurl-alternative", title: "Why people look for a TinyURL alternative" },
      { id: "where-tinyurl-is-ahead", title: "Where TinyURL is ahead" },
      { id: "moving-from-tinyurl", title: "Moving from TinyURL" },
    ],
    faq: [
      {
        q: "Does TinyURL's free plan have click stats?",
        a: "No. Tracked clicks, the analytics dashboard and link history start on its Pro plan.",
      },
      {
        q: "Do TinyURL links expire?",
        a: "TinyURL says links on its Free and Pro plans don't expire, as long as they follow its Terms of Use. Links on its Bulk plans expire after 90 days by default.",
      },
      { q: "Is ndle free?", a: FREE_ANSWER },
    ],
    load: () => import("@/content/alternatives/tinyurl.mdx"),
  },
  {
    slug: "dub",
    competitor: "Dub",
    title: "Free Dub alternative that checks your links",
    description:
      "Dub's free plan allows 25 new links a month. ndle's free plan keeps 100 active links, with click stats and a check on every link every 30 minutes.",
    h1: "A Dub alternative that checks the page behind every link",
    lede: "100 active links, click stats and unlimited QR codes on the free plan, and a check on every link's page every 30 minutes.",
    checked: "2026-09-28",
    sections: [
      { id: "ndle-and-dubs-free-plans-side-by-side", title: "ndle and Dub's free plans, side by side" },
      { id: "why-people-look-for-a-dub-alternative", title: "Why people look for a Dub alternative" },
      { id: "where-dub-is-ahead", title: "Where Dub is ahead" },
      { id: "moving-from-dub", title: "Moving from Dub" },
    ],
    faq: [
      {
        q: "Is Dub free?",
        a: "Dub has a free plan with 25 new links a month, 3 custom domains and 1,000 tracked events a month, kept for 30 days. Its Pro plan is $30 a month.",
      },
      {
        q: "Can I host Dub myself?",
        a: "Yes. Dub's code is open source under the AGPLv3, and its README explains how to self-host it.",
      },
      { q: "Is ndle free?", a: FREE_ANSWER },
    ],
    load: () => import("@/content/alternatives/dub.mdx"),
  },
  {
    slug: "short-io",
    competitor: "Short.io",
    title: "Short.io alternative that checks your links",
    description:
      "Short.io gives 1,000 free links for the life of an account. ndle keeps 100 active links free, with click stats and a check on every link every 30 minutes.",
    h1: "A Short.io alternative that watches your links",
    lede: "100 active links, a custom domain and unlimited QR codes on the free plan, and a check on the page behind every link every 30 minutes.",
    checked: "2026-09-28",
    sections: [
      { id: "ndle-and-shortios-free-plans-side-by-side", title: "ndle and Short.io's free plans, side by side" },
      { id: "why-people-look-for-a-shortio-alternative", title: "Why people look for a Short.io alternative" },
      { id: "where-shortio-is-ahead", title: "Where Short.io is ahead" },
      { id: "moving-from-shortio", title: "Moving from Short.io" },
    ],
    faq: [
      {
        q: "Is Short.io's free plan 1,000 links a month?",
        a: "No. Short.io says its free limits are issued once and used over the life of the account, so 1,000 links is the total.",
      },
      {
        q: "What happens to my Short.io links if I cancel a paid plan?",
        a: "Short.io says your account moves to the free plan and your links keep working within its limits. Deleting the account removes them.",
      },
      { q: "Is ndle free?", a: FREE_ANSWER },
    ],
    load: () => import("@/content/alternatives/short-io.mdx"),
  },
  {
    slug: "rebrandly",
    competitor: "Rebrandly",
    title: "Free Rebrandly alternative with 100 links",
    description:
      "Rebrandly's free plan gives 10 links and 10 watermarked QR codes a month. ndle's gives 100 active links, unlimited QR codes and checks every 30 minutes.",
    h1: "A Rebrandly alternative with room to grow for free",
    lede: "100 active links, your own domain and unlimited, unmarked QR codes on the free plan, and a check on every link's page every 30 minutes.",
    checked: "2026-09-28",
    sections: [
      { id: "ndle-and-rebrandlys-free-plans-side-by-side", title: "ndle and Rebrandly's free plans, side by side" },
      { id: "why-people-look-for-a-rebrandly-alternative", title: "Why people look for a Rebrandly alternative" },
      { id: "where-rebrandly-is-ahead", title: "Where Rebrandly is ahead" },
      { id: "moving-from-rebrandly", title: "Moving from Rebrandly" },
    ],
    faq: [
      {
        q: "What does Rebrandly's free plan include?",
        a: "10 links and 10 QR codes a month, with a watermark on the QR codes, one .bio custom domain, and detailed data on 100 clicks a month.",
      },
      {
        q: "Do Rebrandly links expire?",
        a: "Rebrandly says its links don't expire unless you set a date or delete them, and they keep working if you downgrade to a free account.",
      },
      { q: "Is ndle free?", a: FREE_ANSWER },
    ],
    load: () => import("@/content/alternatives/rebrandly.mdx"),
  },
];

export function getAlternative(slug: string): AlternativePage | undefined {
  return ALTERNATIVES.find((page) => page.slug === slug);
}

export function alternativeUrl(slug: string) {
  return `https://ndle.app/alternatives/${slug}`;
}

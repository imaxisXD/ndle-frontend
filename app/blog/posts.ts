import type { ComponentType } from "react";
import type { MDXContent } from "mdx/types";
import {
  AdDetour,
  BitlyPath,
  GooglTimeline,
  GuestVsAccount,
  QrPath,
  RotRoutes,
  StaticVsDynamic,
  StatusCodes,
  UtmAnatomy,
} from "./_components/diagrams";

/* Every post, newest first. The body is an MDX file in content/blog; this list
   holds what the index, metadata, sitemap and contents sidebar need, so no page
   reads the filesystem at runtime. posts.test.ts checks each post's sections
   against the headings in its MDX file. */

export type Post = {
  slug: string;
  title: string;
  /** Meta description and index summary. Keep it under 155 characters. */
  description: string;
  /** YYYY-MM-DD */
  published: string;
  updated?: string;
  tags: string[];
  author: string;
  /** The post's h2s in order; ids are the slugs rehype-slug gives them. */
  sections: Array<{ id: string; title: string }>;
  /** The diagram shown on the post's index card. */
  cover: ComponentType;
  load: () => Promise<{ default: MDXContent }>;
};

export const POSTS: Post[] = [
  {
    slug: "utm-parameters-explained",
    title: "UTM parameters, explained: what each one does",
    description:
      "What utm_source, utm_medium, utm_campaign and the rest record, how to name them so reports stay clean, and where to use them. With a free UTM builder.",
    published: "2026-09-28",
    tags: ["Guide", "UTM"],
    author: "Abhishek",
    sections: [
      { id: "the-parameters", title: "The parameters" },
      { id: "how-to-name-them", title: "How to name them" },
      { id: "where-to-use-them", title: "Where to use them" },
      { id: "build-one", title: "Build one" },
      { id: "keep-campaign-links-short", title: "Keep campaign links short" },
    ],
    cover: UtmAnatomy,
    load: () => import("@/content/blog/utm-parameters-explained.mdx"),
  },
  {
    slug: "do-qr-codes-expire",
    title: "Do QR codes expire? Static vs dynamic, explained",
    description:
      "A QR code can't expire, but the link inside it can. How static and dynamic codes differ, when dynamic ones stop working, and how to make one that lasts.",
    published: "2026-09-28",
    tags: ["Guide", "QR codes"],
    author: "Abhishek",
    sections: [
      { id: "static-codes-dont-expire", title: "Static codes don't expire" },
      { id: "dynamic-codes-can", title: "Dynamic codes can" },
      { id: "how-to-tell-which-one-you-have", title: "How to tell which one you have" },
      { id: "make-one-that-lasts", title: "Make one that lasts" },
    ],
    cover: StaticVsDynamic,
    load: () => import("@/content/blog/do-qr-codes-expire.mdx"),
  },
  {
    slug: "shorten-link-without-account",
    title: "How to shorten a link without an account",
    description:
      "Shorten a link with no sign-up, no email and no card. What a guest link gives you, what it doesn't, and when a free account is worth making instead.",
    published: "2026-09-28",
    tags: ["Guide", "Links"],
    author: "Abhishek",
    sections: [
      { id: "shorten-a-link-in-ndle-without-signing-up", title: "Shorten a link in ndle without signing up" },
      { id: "what-you-give-up-without-an-account", title: "What you give up without an account" },
      { id: "when-to-make-a-free-account-instead", title: "When to make a free account instead" },
    ],
    cover: GuestVsAccount,
    load: () => import("@/content/blog/shorten-link-without-account.mdx"),
  },
  {
    slug: "check-if-link-is-working",
    title: "How to check if a link is working, step by step",
    description:
      "Clicking a link only proves it works for you, now. How to test it like a reader, read its status code, follow redirects and catch pages that fail quietly.",
    published: "2026-09-28",
    tags: ["Guide", "Links"],
    author: "Abhishek",
    sections: [
      { id: "open-it-the-way-your-readers-will", title: "Open it the way your readers will" },
      { id: "read-the-status-code", title: "Read the status code" },
      { id: "follow-the-redirects", title: "Follow the redirects" },
      { id: "check-the-certificate", title: "Check the certificate" },
      { id: "watch-for-pages-that-fail-quietly", title: "Watch for pages that fail quietly" },
      { id: "keep-checking-it", title: "Keep checking it" },
    ],
    cover: StatusCodes,
    load: () => import("@/content/blog/check-if-link-is-working.mdx"),
  },
  {
    slug: "what-is-link-rot",
    title: "What is link rot, and how do you slow it down?",
    description:
      "38% of webpages from 2013 were gone a decade later. What link rot is, how common it is, why short links rot twice, and how to keep your links working.",
    published: "2026-09-28",
    tags: ["Guide", "Link rot"],
    author: "Abhishek",
    sections: [
      { id: "what-link-rot-looks-like", title: "What link rot looks like" },
      { id: "how-common-it-is", title: "How common it is" },
      { id: "why-links-rot", title: "Why links rot" },
      { id: "short-links-rot-twice", title: "Short links rot twice" },
      { id: "how-to-slow-it-down", title: "How to slow it down" },
      { id: "where-ndle-fits", title: "Where ndle fits" },
    ],
    cover: RotRoutes,
    load: () => import("@/content/blog/what-is-link-rot.mdx"),
  },
  {
    slug: "do-short-links-expire",
    title: "Do short links expire? Bitly, TinyURL and goo.gl compared",
    description:
      "Most short links don't expire by default, but they last only as long as the service, your account and the page behind them. What each shortener promises.",
    published: "2026-09-28",
    tags: ["Guide", "Link rot"],
    author: "Abhishek",
    sections: [
      { id: "the-short-answer-by-service", title: "The short answer, by service" },
      { id: "what-happened-to-googl", title: "What happened to goo.gl" },
      { id: "never-expires-comes-with-conditions", title: "\"Never expires\" comes with conditions" },
      { id: "what-about-qr-codes", title: "What about QR codes?" },
      { id: "how-to-keep-a-link-working-for-years", title: "How to keep a link working for years" },
      { id: "where-ndle-stands", title: "Where ndle stands" },
    ],
    cover: GooglTimeline,
    load: () => import("@/content/blog/do-short-links-expire.mdx"),
  },
  {
    slug: "bitly-link-not-working",
    title: "Why is my Bitly link not working? Causes and fixes",
    description:
      "A Bitly link can fail at the link, at Bitly, or at the page it opens. How to tell which, from typos and warning pages to custom domains and blocked texts.",
    published: "2026-09-28",
    tags: ["Guide", "Bitly"],
    author: "Abhishek",
    sections: [
      { id: "check-where-the-link-goes", title: "Check where the link goes" },
      { id: "problems-with-the-link-itself", title: "Problems with the link itself" },
      { id: "problems-with-the-page-it-points-to", title: "Problems with the page it points to" },
      { id: "when-bitly-steps-in", title: "When Bitly steps in" },
      { id: "custom-domain-problems", title: "Custom domain problems" },
      { id: "when-the-network-blocks-it", title: "When the network blocks it" },
      { id: "keep-it-from-happening-again", title: "Keep it from happening again" },
    ],
    cover: BitlyPath,
    load: () => import("@/content/blog/bitly-link-not-working.mdx"),
  },
  {
    slug: "bitly-free-plan",
    title: "Bitly's free plan in 2026: limits, ads and free alternatives",
    description:
      "Bitly's free plan gives you 5 links and 2 QR codes a month, with an ad page on every link. What it includes, what paid adds, and the free alternatives.",
    published: "2026-09-28",
    tags: ["Comparison", "Bitly"],
    author: "Abhishek",
    sections: [
      { id: "what-bitlys-free-plan-includes", title: "What Bitly's free plan includes" },
      { id: "the-ad-page-on-free-links", title: "The ad page on free links" },
      { id: "what-the-cheapest-paid-plan-adds", title: "What the cheapest paid plan adds" },
      { id: "free-plans-compared", title: "Free plans compared" },
      { id: "which-free-plan-fits", title: "Which free plan fits" },
      { id: "where-ndle-fits", title: "Where ndle fits" },
    ],
    cover: AdDetour,
    load: () => import("@/content/blog/bitly-free-plan.mdx"),
  },
  {
    slug: "qr-code-stopped-working",
    title: "QR code stopped working? Check the destination first",
    description:
      "Most QR codes that stop working aren't damaged: the link behind them broke. Find which part failed, fix a printed code, and keep the next one working.",
    published: "2026-09-27",
    tags: ["Guide", "QR codes"],
    author: "Abhishek",
    sections: [
      { id: "find-which-part-broke", title: "Find which part broke" },
      { id: "why-the-link-behind-a-qr-code-stops-working", title: "Why the link behind a QR code stops working" },
      { id: "static-or-dynamic-which-did-you-print", title: "Static or dynamic: which did you print?" },
      { id: "fix-a-code-thats-already-printed", title: "Fix a code that's already printed" },
      { id: "keep-the-next-one-working", title: "Keep the next one working" },
    ],
    cover: QrPath,
    load: () => import("@/content/blog/qr-code-stopped-working.mdx"),
  },
];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((post) => post.slug === slug);
}

export const BLOG_URL = "https://ndle.app/blog";

export function postUrl(slug: string) {
  return `${BLOG_URL}/${slug}`;
}

/** "2026-09-27" → "27 Sep 2026", fixed to UTC so build and browser agree. */
export function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

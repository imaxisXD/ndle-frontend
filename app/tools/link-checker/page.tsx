import type { Metadata } from "next";
import { ProductArticle } from "@/app/blog/_components/product-article";
import Body from "@/content/tools/link-checker.mdx";
import { turnstileSiteKey } from "@/lib/turnstile";
import { LinkChecker } from "./link-checker";

const PAGE_URL = "https://ndle.app/tools/link-checker";
const TITLE = "Is this link working? Free link checker";
const DESCRIPTION =
  "Check if a link is working: see its status code, every redirect and how long it takes. Free, no sign-up, with the same rules as ndle's link monitoring.";
const UPDATED = "2026-09-28";

export const metadata: Metadata = {
  title: `${TITLE} | ndle`,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/link-checker" },
  openGraph: { type: "website", title: `${TITLE} | ndle`, description: DESCRIPTION, url: PAGE_URL, siteName: "ndle" },
  twitter: { card: "summary_large_image", title: `${TITLE} | ndle`, description: DESCRIPTION, creator: "@abhishk_084" },
};

const SECTIONS = [
  { id: "what-this-checks", title: "What this checks" },
  { id: "reading-the-result", title: "Reading the result" },
  { id: "what-it-cant-see", title: "What it can't see" },
  { id: "check-it-again-tomorrow", title: "Check it again tomorrow" },
];

const FAQ = [
  {
    q: "Is the link checker free?",
    a: "Yes, with no sign-up. Each network can run 20 checks an hour: plenty for a person, not enough for a script.",
  },
  {
    q: "Do you keep the links I check?",
    a: "No. The link is checked and the result comes back to you; nothing about it is saved. Your network address is used only to limit how many checks run each hour.",
  },
  {
    q: "Why is there a security check?",
    a: "Each check sends requests to someone else's website, so the checker is protected by Cloudflare Turnstile. Most people never see it; it asks for a click only when it isn't sure.",
  },
  {
    q: "Why does it say it couldn't tell?",
    a: "The site answered 401, 403, 429 or 503. That usually means it blocks automated checks or is limiting requests. Open the link in a browser to see what people get.",
  },
];

export default function LinkCheckerPage() {
  return (
    <ProductArticle
      url={PAGE_URL}
      title={TITLE}
      description={DESCRIPTION}
      tag="Free tool"
      eyebrow="Link checker"
      h1="Is this link working?"
      lede="Paste a link to see its status code, every redirect it takes, and how long it took to answer."
      dated={UPDATED}
      dateLabel="Updated"
      sections={SECTIONS}
      faq={FAQ}
      action={<LinkChecker siteKey={turnstileSiteKey()} />}
    >
      <Body />
    </ProductArticle>
  );
}

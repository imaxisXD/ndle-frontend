import type { Metadata } from "next";
import { ProductArticle } from "@/app/blog/_components/product-article";
import Body from "@/content/tools/utm-builder.mdx";
import { UtmBuilder } from "./utm-builder";

const PAGE_URL = "https://ndle.app/tools/utm-builder";
const TITLE = "Free UTM builder for campaign links";
const DESCRIPTION =
  "Build a UTM link in seconds: add source, medium and campaign to any page address, with warnings for missing or mixed-case values. Free, in your browser.";
const UPDATED = "2026-09-28";

export const metadata: Metadata = {
  title: `${TITLE} | ndle`,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/utm-builder" },
  openGraph: { type: "website", title: `${TITLE} | ndle`, description: DESCRIPTION, url: PAGE_URL, siteName: "ndle" },
  twitter: { card: "summary_large_image", title: `${TITLE} | ndle`, description: DESCRIPTION, creator: "@abhishk_084" },
};

const SECTIONS = [
  { id: "what-each-field-does", title: "What each field does" },
  { id: "name-them-the-same-way-every-time", title: "Name them the same way every time" },
  { id: "shorten-the-result", title: "Shorten the result" },
];

const FAQ = [
  {
    q: "Is the UTM builder free?",
    a: "Yes, with no sign-up. It runs in your browser, and nothing you type is sent anywhere.",
  },
  {
    q: "Which UTM parameters do I need?",
    a: "Google says to always set utm_source, utm_medium and utm_campaign. The others are optional.",
  },
  {
    q: "Are UTM values case sensitive?",
    a: "Yes. utm_source=Facebook and utm_source=facebook count as two sources in Google Analytics, so stick to lowercase.",
  },
];

export default function UtmBuilderPage() {
  return (
    <ProductArticle
      url={PAGE_URL}
      title={TITLE}
      description={DESCRIPTION}
      tag="Free tool"
      eyebrow="UTM builder"
      h1="UTM builder"
      lede="Add campaign tags to any link, so Google Analytics shows exactly where each visit came from."
      dated={UPDATED}
      dateLabel="Updated"
      sections={SECTIONS}
      faq={FAQ}
      action={<UtmBuilder />}
    >
      <Body />
    </ProductArticle>
  );
}

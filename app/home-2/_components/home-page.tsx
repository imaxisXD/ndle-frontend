import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { FAQ } from "./faq";
import { HomeTwo } from "./home-two";
import "../home-2.css";

/* The home page at "/": its search copy, its structured data, and the page.
   app/page.tsx renders it and uses HOME_METADATA. Search copy promises only
   what ships (docs/feature-status.md). */

const TITLE = "ndle: Free URL Shortener That Catches Broken Links";
const DESCRIPTION =
  "Free URL shortener that checks every link every 30 minutes and flags 404s, timeouts and expired SSL. Click analytics, QR codes and 1 custom domain, free.";
const SHARE_ALT = "ndle: short links, watched. A free URL shortener that checks every link every 30 minutes.";

export const HOME_METADATA: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://ndle.app",
    siteName: "ndle",
    locale: "en_US",
    type: "website",
    // The card, app/opengraph-image.tsx. Named here because this openGraph
    // replaces the one Next would attach from that file.
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: SHARE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@abhishk_084",
    images: ["/opengraph-image"],
  },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "WebSite", "@id": "https://ndle.app/#website", name: "ndle", url: "https://ndle.app" },
    {
      "@type": "SoftwareApplication",
      name: "ndle",
      url: "https://ndle.app",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: {
        "@type": "Person",
        name: "Abhishek",
        sameAs: ["https://x.com/abhishk_084", "https://www.linkedin.com/in/abhishek-ichi/", "https://github.com/imaxisXD"],
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};

export function HomePage() {
  // Marketing copy is set in Geist Sans; the product views keep Geist Mono.
  return (
    <div className={GeistSans.variable}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }}
      />
      <HomeTwo />
    </div>
  );
}

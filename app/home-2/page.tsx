import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { FAQ } from "./_components/faq";
import { HomeTwo } from "./_components/home-two";
import "./home-2.css";

/* Search copy. Promise only what ships (docs/feature-status.md): checks every
   30 minutes, breakages flagged on the dashboard, no owner emails yet. */
const TITLE = "ndle: Free URL Shortener That Catches Broken Links";
const DESCRIPTION =
  "Free URL shortener that checks every link every 30 minutes and flags 404s, timeouts and expired SSL. Click analytics, QR codes and 1 custom domain, free.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://ndle.app",
    siteName: "ndle",
    locale: "en_US",
    type: "website",
    // Still the old card; replace it before this page replaces `/`.
    images: [{ url: "/opengraph-image.webp", width: 1200, height: 630, alt: "ndle, a URL shortener that checks your links" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    creator: "@abhishk_084",
    images: ["/opengraph-image.webp"],
  },
  // Runs beside the current home page; keep it out of search results until it replaces `/`.
  robots: { index: false, follow: true },
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

export default function HomeTwoPage() {
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

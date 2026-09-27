import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { HomeTwo } from "./_components/home-two";
import "./home-2.css";

export const metadata: Metadata = {
  title: "ndle — short links, watched",
  description:
    "Short links that tell you when they break. ndle checks your links every 60 seconds and emails you when one fails.",
  // Runs beside the current home page; keep it out of search results until it replaces `/`.
  robots: { index: false, follow: true },
};

export default function HomeTwoPage() {
  // Marketing copy is set in Geist Sans; the product views keep Geist Mono.
  return (
    <div className={GeistSans.variable}>
      <HomeTwo />
    </div>
  );
}

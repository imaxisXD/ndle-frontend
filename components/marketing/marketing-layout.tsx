import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { bebas } from "@/app/home-2/_components/fonts";
import { HOME_PATH } from "@/app/home-2/_components/kit";
import { SiteFooter } from "@/app/home-2/_components/site-footer";
import { SiteNav } from "@/app/home-2/_components/site-nav";
import "@/app/home-2/home-2.css";

/** Shared frame for marketing sections (blog, alternatives, use cases, tools). */
export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${GeistSans.variable} ${bebas.variable} h2-day min-h-dvh font-sans antialiased`}
    >
      <SiteNav home={HOME_PATH} />
      <main id="main">{children}</main>
      <SiteFooter home={HOME_PATH} />
    </div>
  );
}

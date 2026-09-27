import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { bebas } from "../home-2/_components/fonts";
import { HOME_PATH } from "../home-2/_components/kit";
import { SiteFooter } from "../home-2/_components/site-footer";
import { SiteNav } from "../home-2/_components/site-nav";
import "../home-2/home-2.css";

/* Comparison pages wear the same frame as the blog (app/blog/layout.tsx): the
   landing page's nav, footer, tokens and type. */
export default function AlternativesLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${GeistSans.variable} ${bebas.variable} h2-day min-h-dvh font-sans antialiased`}>
      <SiteNav home={HOME_PATH} />
      <main id="main">{children}</main>
      <SiteFooter home={HOME_PATH} />
    </div>
  );
}

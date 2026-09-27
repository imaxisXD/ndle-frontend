import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { bebas } from "../home-2/_components/fonts";
import { HOME_PATH } from "../home-2/_components/kit";
import { SiteFooter } from "../home-2/_components/site-footer";
import { SiteNav } from "../home-2/_components/site-nav";
// The landing page's tokens (--fg, --line, --sig…) and canvases. Titles use the
// features bento's Bebas Neue; reading text stays in Geist Sans.
import "../home-2/home-2.css";

/* The blog wears the landing page's nav and footer; their section links lead
   back to the landing page. */
export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${GeistSans.variable} ${bebas.variable} h2-day min-h-dvh font-sans antialiased`}>
      <SiteNav home={HOME_PATH} />
      <main id="main">{children}</main>
      <SiteFooter home={HOME_PATH} />
    </div>
  );
}

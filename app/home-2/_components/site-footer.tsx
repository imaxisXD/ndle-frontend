import { cn } from "@/lib/utils";
import { FOCUS, HOME_PATH, Wordmark } from "./kit";

/* The site's footer, shared by the landing page and the blog: black, on ndle's
   dot grid in white, the way capy's footer sits on its pattern. On the landing
   page its section links are in-page anchors; elsewhere (`home`) they lead back
   to the landing page's sections. */

const ON_INK_FOCUS = "focus-visible:ring-offset-[#141312]";

function footerLinks(home: string) {
  return {
    Product: [
      { label: "Monitoring", href: `${home}#monitoring` },
      { label: "Analytics", href: `${home}#analytics` },
      { label: "Collections", href: `${home}#collections` },
      { label: "Free plan", href: `${home}#pricing` },
      { label: "Questions", href: `${home}#faq` },
      { label: "Blog", href: "/blog" },
    ],
    "Use it for": [
      { label: "QR codes", href: "/use-cases/qr-codes" },
      { label: "Link in bio", href: "/use-cases/link-in-bio" },
    ],
    "Free tools": [
      { label: "Link checker", href: "/tools/link-checker" },
      { label: "UTM builder", href: "/tools/utm-builder" },
    ],
    // One line per page in app/alternatives/pages.ts.
    Compare: [
      { label: "ndle vs Bitly", href: "/alternatives/bitly" },
      { label: "ndle vs TinyURL", href: "/alternatives/tinyurl" },
      { label: "ndle vs Dub", href: "/alternatives/dub" },
      { label: "ndle vs Short.io", href: "/alternatives/short-io" },
      { label: "ndle vs Rebrandly", href: "/alternatives/rebrandly" },
      { label: "goo.gl alternative", href: "/alternatives/google-url-shortener" },
    ],
    Follow: [
      { label: "X", href: "https://x.com/abhishk_084" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/abhishek-ichi/" },
      { label: "GitHub", href: "https://github.com/imaxisXD" },
    ],
  };
}

/** `home`: prefix for the section links, "" on the landing page itself. */
export function SiteFooter({ home = "" }: { home?: string }) {
  const onLanding = home === "";
  return (
    <footer className="relative bg-[#141312] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "16px 16px" }}
      />
      <div className="relative mx-auto flex max-w-[1240px] flex-col gap-12 px-5 pt-16 pb-10 sm:px-8 lg:flex-row lg:justify-between">
        <nav aria-label="Footer" className="flex flex-wrap gap-x-16 gap-y-10">
          {Object.entries(footerLinks(home)).map(([title, links]) => (
            <div key={title}>
              <p className="font-[family-name:var(--font-bebas)] text-[26px] leading-none text-white/55 uppercase">{title}</p>
              <ul className="mt-4 space-y-2.5 font-mono text-sm">
                {links.map((l) => {
                  const external = l.href.startsWith("http");
                  return (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        className={cn("rounded-sm text-white/85 hover:text-white", FOCUS, ON_INK_FOCUS)}
                      >
                        {l.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="lg:text-right">
          <a
            href={onLanding ? "#top" : HOME_PATH}
            aria-label={onLanding ? "ndle, back to top" : "ndle home"}
            className={cn("-m-1 inline-block rounded-sm p-1", FOCUS, ON_INK_FOCUS)}
          >
            <Wordmark className="text-[52px]" />
          </a>
          <p className="mt-3 font-mono text-sm text-white/85">Short. Sharp. Smarter.</p>
          <p className="mt-1 font-mono text-xs text-white/45">
            © ndle · made by{" "}
            <a
              href="https://x.com/abhishk_084"
              target="_blank"
              rel="noopener noreferrer"
              className={cn("rounded-sm underline-offset-4 hover:underline", FOCUS, ON_INK_FOCUS)}
            >
              Abhishek
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

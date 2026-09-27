import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActionLink, FOCUS } from "@/app/home-2/_components/kit";
import { SIGN_UP, SignupBox, Tag } from "./chrome";
import { formatDate } from "../posts";

/* A product page in the blog's frame: comparison pages (app/alternatives) and
   use-case pages (app/use-cases). A post-style header with the sign-up button
   up front, the contents and sign-up box beside the body, and the page's
   questions at the end, which also go out as FAQPage data. */

export type ProductArticleProps = {
  url: string;
  title: string;
  description: string;
  tag: string;
  eyebrow: string;
  h1: string;
  lede: string;
  /** YYYY-MM-DD, shown after `dateLabel`. */
  dated: string;
  dateLabel: string;
  sections: Array<{ id: string; title: string }>;
  faq: Array<{ q: string; a: string }>;
  /** Replaces the sign-up button in the header, e.g. with a tool. */
  action?: ReactNode;
  children: ReactNode;
};

export function ProductArticle({
  url,
  title,
  description,
  tag,
  eyebrow,
  h1,
  lede,
  dated,
  dateLabel,
  sections,
  faq,
  action,
  children,
}: ProductArticleProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", name: title, description, url, dateModified: dated },
      {
        "@type": "FAQPage",
        mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />

      {/* The same header as a blog post (app/blog/[slug]/page.tsx), with the
          sign-up button up front: people on these pages are choosing. */}
      <header className="h2-canvas border-b-2 border-[#141312]">
        <div className="mx-auto max-w-[1100px] px-5 pt-14 pb-12 sm:px-8 lg:grid lg:grid-cols-[220px_minmax(0,680px)] lg:gap-16 lg:pt-20 lg:pb-16">
          <div className="lg:col-start-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[#3d3d3d]">
              <Tag lit>{tag}</Tag>
              <span>{eyebrow}</span>
            </div>
            <h1 className="mt-5 font-[family-name:var(--font-bebas)] text-[clamp(2.9rem,6vw,4.5rem)] leading-[0.9] tracking-[-0.005em] text-balance text-[#141312] uppercase">
              {h1}
            </h1>
            <p className="mt-5 max-w-[60ch] font-mono text-[15px] leading-[1.5] text-pretty text-[#3d3d3d]">{lede}</p>
            {action ? <div className="mt-7">{action}</div> : null}
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              {!action && <ActionLink href={SIGN_UP}>Get started free</ActionLink>}
              <p className="font-mono text-xs text-[#3d3d3d]">
                {dateLabel}{" "}
                <time dateTime={dated}>{formatDate(dated)}</time>
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-5 pt-4 pb-24 sm:px-8 lg:grid lg:grid-cols-[220px_minmax(0,680px)] lg:gap-16">
        <div className="hidden lg:block">
          <div className="sticky top-24 space-y-8 pt-10">
            <nav aria-labelledby="contents-title">
              <p
                id="contents-title"
                className="font-[family-name:var(--font-bebas)] text-[28px] leading-none tracking-[-0.005em] text-[#141312] uppercase"
              >
                Contents
              </p>
              <ol className="mt-3 space-y-2 text-sm leading-5">
                {[...sections, { id: "questions", title: "Questions" }].map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={cn(
                        "text-[#3d3d3d] hover:text-[#141312] hover:underline hover:decoration-[var(--sig)] hover:decoration-2 hover:underline-offset-4",
                        FOCUS,
                      )}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <SignupBox />
          </div>
        </div>

        <div className="min-w-0">
          {children}

          <section aria-labelledby="questions" className="mt-14">
            <h2
              id="questions"
              className="scroll-mt-24 font-[family-name:var(--font-bebas)] text-[2.4rem] leading-[0.95] tracking-[-0.005em] text-[#141312] uppercase"
            >
              Questions
            </h2>
            <dl className="mt-5 space-y-4">
              {faq.map(({ q, a }) => (
                <div key={q} className="border-2 border-[#141312] bg-white px-5 py-4">
                  <dt className="text-base font-medium text-[#141312]">{q}</dt>
                  <dd className="mt-1.5 text-[1.0625rem] leading-7 text-[var(--fg-2)]">{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <SignupBox className="mt-16 lg:hidden" />
        </div>
      </div>
    </article>
  );
}

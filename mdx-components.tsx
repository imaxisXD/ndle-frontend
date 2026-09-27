import type { MDXComponents } from "mdx/types";
import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/* How blog post MDX renders. Section titles take the landing bento's Bebas
   Neue in ink; reading text stays in Geist Sans, in the landing page's tokens
   (--fg, --fg-2, --sig from app/home-2/home-2.css). Required by @next/mdx for
   the App Router. */

const FOCUS =
  "rounded-sm focus-visible:ring-[3px] focus-visible:ring-[oklch(0.86_0.17_88/0.5)] focus-visible:ring-offset-2 focus-visible:outline-none";

function Anchor({ href = "", className, children, ...props }: ComponentPropsWithoutRef<"a">) {
  const style = cn(
    "text-[var(--fg)] underline decoration-[var(--sig)] decoration-2 underline-offset-4 hover:decoration-[oklch(0.72_0.16_82)]",
    FOCUS,
    className,
  );
  if (href.startsWith("/") || href.startsWith("#"))
    return (
      <Link href={href} className={style} {...props}>
        {children}
      </Link>
    );
  return (
    <a href={href} className={style} rel="noopener" {...props}>
      {children}
    </a>
  );
}

const components: MDXComponents = {
  h2: ({ className, children, ...props }) => (
    <h2
      className={cn(
        "mt-14 mb-3 scroll-mt-24 font-[family-name:var(--font-bebas)] text-[2.4rem] leading-[0.95] tracking-[-0.005em] text-balance text-[#141312] uppercase",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ className, children, ...props }) => (
    <h3 className={cn("mt-8 mb-2 scroll-mt-24 text-lg font-medium text-[var(--fg)]", className)} {...props}>
      {children}
    </h3>
  ),
  p: ({ className, ...props }) => (
    <p className={cn("my-5 text-[1.0625rem] leading-8 text-pretty text-[var(--fg-2)]", className)} {...props} />
  ),
  a: Anchor,
  strong: ({ className, ...props }) => <strong className={cn("font-medium text-[var(--fg)]", className)} {...props} />,
  ul: ({ className, ...props }) => (
    <ul
      className={cn("my-5 list-disc space-y-3 pl-5 text-[1.0625rem] leading-8 text-[var(--fg-2)] marker:text-[var(--fg-3)]", className)}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "my-5 list-decimal space-y-3 pl-5 text-[1.0625rem] leading-8 text-[var(--fg-2)] marker:font-mono marker:text-sm marker:text-[var(--fg-3)]",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => <li className={cn("pl-1", className)} {...props} />,
  code: ({ className, ...props }) => (
    <code className={cn("rounded-sm bg-black/[0.05] px-1 py-0.5 font-mono text-[0.88em] text-[var(--fg)]", className)} {...props} />
  ),
  // Code blocks in ink, like the footer; the inline-code chip is undone inside.
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "my-6 overflow-x-auto rounded-md bg-[#141312] p-4 font-mono text-[13px] leading-6 text-white [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote className={cn("my-6 border-l-2 border-[var(--sig)] pl-4 text-[var(--fg)]", className)} {...props} />
  ),
  hr: () => <hr className="my-12 border-t border-dashed border-gray-400/60" />,
  // GFM tables, framed in 2px ink like the diagrams; wide ones scroll sideways.
  table: ({ className, ...props }) => (
    <div className="my-8 overflow-x-auto border-2 border-[#141312] bg-white">
      <table className={cn("w-full min-w-[560px] border-collapse text-left text-sm", className)} {...props} />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border-b-2 border-[#141312] px-4 py-3 font-mono text-xs font-normal tracking-[0.06em] text-[#3d3d3d] uppercase",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("border-t border-[var(--line)] px-4 py-3 align-top leading-6 text-[var(--fg-2)]", className)} {...props} />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}

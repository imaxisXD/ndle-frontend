import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ActionLink } from "@/app/home-2/_components/kit";

/* The blog's own pieces, in the landing page's language. The nav and footer
   are the site's (app/home-2/_components/site-nav.tsx and site-footer.tsx). */

export const SIGN_UP = "/sign-up?redirect_url=/dashboard";

/** A post tag: a small ink-edged chip; the first one is Signal Yellow. */
export function Tag({ children, lit = false }: { children: ReactNode; lit?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-[4px] border border-[#141312] px-1.5 font-mono text-[11px] leading-[18px] text-[#141312]",
        lit ? "bg-[var(--sig)]" : "bg-white",
      )}
    >
      {children}
    </span>
  );
}

/** The sign-up box beside each post, and at the end of it on small screens. */
export function SignupBox({ className }: { className?: string }) {
  return (
    <aside aria-label="Try ndle" className={cn("border-2 border-[#141312] bg-white p-5", className)}>
      <p className="font-[family-name:var(--font-bebas)] text-[28px] leading-[0.95] tracking-[-0.005em] text-[#141312] uppercase">
        ndle watches your links, free
      </p>
      <p className="mt-2 font-mono text-[13px] leading-5 text-[#3d3d3d]">
        ndle checks every short link every 30 minutes and flags the ones that break. No ads, and links don&apos;t
        expire.
      </p>
      <ActionLink href={SIGN_UP} className="mt-4 w-full">
        Start free
      </ActionLink>
    </aside>
  );
}

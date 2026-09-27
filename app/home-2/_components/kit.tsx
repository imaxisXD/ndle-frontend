import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

/* Actions in the dashboard's own button language: the yellow primary and the
   quiet outline, same radius, same focus ring. */

/** Where the landing page lives; the shared nav and footer link here. */
export const HOME_PATH = "/";

export const FOCUS =
  "focus-visible:ring-[3px] focus-visible:ring-[oklch(0.86_0.17_88/0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] focus-visible:outline-none";

/* The wordmark in plain type, in Signal Yellow. A hairline of amber and a
   soft shadow keep the pale yellow legible on the light page. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "block leading-none font-semibold tracking-[-0.05em] text-[var(--sig)] [text-shadow:0_0_0.6px_oklch(0.55_0.13_75/0.9),0_1px_1px_rgb(0_0_0/0.12)]",
        className,
      )}
    >
      ndle
    </span>
  );
}

export function ActionLink({
  href,
  children,
  tone = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: "primary" | "outline" | "onDark";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-5 text-sm font-medium transition-[background-color,box-shadow,scale] duration-150 active:scale-[0.98]",
        tone === "primary"
          ? "bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-sm"
          : tone === "outline"
            ? "border-border bg-background border shadow-xs hover:bg-white"
            : "border border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12]",
        FOCUS,
        className,
      )}
    >
      {children}
      {tone === "primary" && <ArrowRightIcon size={16} />}
    </Link>
  );
}

/* ───────── The comic sections (bento, plans, questions, close) ───────── */

/* After capy.ai's: ink edges, tall capitals, mono copy. Ink is #141312. The
   capitals come from `--font-bebas`, set on the page root (fonts.ts). Their
   buttons are the dashboard's own (ActionLink), not capy's. */

/** A section's title in the tall capitals. */
export const INK_TITLE =
  "font-[family-name:var(--font-bebas)] text-[clamp(2.75rem,5vw,3.5rem)] leading-[0.9] tracking-[-0.01em] text-[#141312] uppercase";

/** The round badge over a section title: an icon on Signal Yellow, tilted. */
export function InkBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-16 -rotate-6 items-center justify-center rounded-full border-2 border-[#141312] bg-[var(--sig)] text-[#141312]",
        className,
      )}
    >
      {children}
    </span>
  );
}

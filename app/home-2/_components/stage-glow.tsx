import { cn } from "@/lib/utils";

/* The page's light source: one warm Signal Yellow light centred behind the
   product, with a softer pool where it falls on the surface below. When the
   sample link goes down the light turns red; it comes back when the link
   recovers. Built for the light stage: washes, not neon. */

export type GlowTone = "amber" | "red";

const AMBER = [
  "radial-gradient(46% 42% at 50% 46%, oklch(0.9 0.15 90 / 0.6), transparent 72%)",
  "radial-gradient(30% 38% at 24% 55%, oklch(0.88 0.13 72 / 0.4), transparent 72%)",
  "radial-gradient(30% 38% at 76% 55%, oklch(0.9 0.14 95 / 0.4), transparent 72%)",
  "radial-gradient(52% 22% at 50% 100%, oklch(0.9 0.13 85 / 0.45), transparent 72%)",
].join(",");

const RED = [
  "radial-gradient(46% 42% at 50% 46%, oklch(0.84 0.11 25 / 0.55), transparent 72%)",
  "radial-gradient(30% 38% at 24% 55%, oklch(0.82 0.12 18 / 0.4), transparent 72%)",
  "radial-gradient(30% 38% at 76% 55%, oklch(0.86 0.1 30 / 0.4), transparent 72%)",
  "radial-gradient(52% 22% at 50% 100%, oklch(0.85 0.1 25 / 0.45), transparent 72%)",
].join(",");

export function StageGlow({ tone = "amber", className }: { tone?: GlowTone; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute", className)}>
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-[1200ms] ease-out",
          tone === "amber" ? "opacity-100" : "opacity-0",
        )}
        style={{ background: AMBER, filter: "blur(56px)" }}
      />
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-out",
          tone === "red" ? "opacity-100" : "opacity-0",
        )}
        style={{ background: RED, filter: "blur(56px)" }}
      />
    </div>
  );
}

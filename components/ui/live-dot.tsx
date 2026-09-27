import { cn } from "@/lib/utils";

/**
 * The green "live" dot from the Live Click Counter: a soft emerald glow, a
 * thin ring, and a gradient core that blinks. Sized by `className` (8px by
 * default); everything inside scales with it.
 */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-2 items-center justify-center", className)}>
      <span className="absolute inline-flex size-[170%] rounded-full bg-emerald-400/25 blur-xs" />
      <span className="absolute inline-flex size-full rounded-full border border-emerald-400/70" />
      <span className="animate-live-blip relative inline-flex size-[80%] rounded-full bg-linear-to-tr from-emerald-300 to-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.85)] duration-1000 ease-linear" />
    </span>
  );
}

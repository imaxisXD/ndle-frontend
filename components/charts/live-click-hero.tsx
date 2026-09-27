import { AnimatedCounter } from "react-animated-counter";
import { MouseButtonLeft } from "iconoir-react";
import { LiveDot } from "@/components/ui/live-dot";

/** The counter's texture: a faint white checker, for the black circle
    behind a live number. Shared with the landing page's plans banner. */
export const COUNTER_TEXTURE = {
  backgroundImage:
    "conic-gradient(from 0deg at 50% 50%, #e5e7eb26 0deg, #e5e7eb17 90deg, transparent 90deg)",
  backgroundSize: "9px 9px",
};

export function LiveClickHero({ counterValue }: { counterValue: number }) {
  return (
    <section className="bg-surface-raised border-border shadow-raised relative isolate overflow-hidden rounded-md border px-6 py-1 md:px-6">
      {/* black circle  */}
      <div
        className="pointer-events-none absolute -top-20 -right-3 -z-10 hidden size-64 rounded-full bg-black md:block"
        style={COUNTER_TEXTURE}
      />

      <div className="flex flex-col items-start justify-between gap-4 pr-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="from-accent/70 to-accent/30 border-accent inline-flex size-10 items-center justify-center rounded-lg border bg-linear-to-tr text-black/80">
            <MouseButtonLeft className="size-5" />
          </span>
          <div className="flex flex-col items-start justify-center">
            <h2 className="text-primary flex items-center justify-center gap-2 text-base leading-none font-medium tracking-tight">
              <LiveDot />
              Live Click Counter
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              The realtime link click counter
            </p>
          </div>
        </div>

        <div className="font-doto text-primary flex flex-col items-center justify-center rounded-full p-2 text-2xl leading-none font-black md:text-6xl md:text-white/90">
          <AnimatedCounter
            value={counterValue}
            includeDecimals={false}
            fontSize="44px"
            color="inherit"
            containerStyles={{
              margin: "0 auto",
            }}
          />
          <span className="text-muted-foreground md:text-accent font-mono text-xs font-normal">
            [total clicks]
          </span>
        </div>
      </div>
    </section>
  );
}

import { AnimatedCounter } from "react-animated-counter";
import { MouseButtonLeft } from "iconoir-react";

export function LiveClickHero({ counterValue }: { counterValue: number }) {
  return (
    <section className="bg-card border-border relative isolate overflow-hidden rounded-lg border px-6 py-1 shadow-sm md:px-6">
      {/* black circle  */}
      <div
        className="pointer-events-none absolute -top-20 -right-3 -z-10 size-64 rounded-full bg-black"
        style={{
          backgroundImage:
            "conic-gradient(from 0deg at 50% 50%, #e5e7eb26 0deg, #e5e7eb17 90deg, transparent 90deg)",
          backgroundSize: "9px 9px",
        }}
      />

      <div className="flex flex-col items-start justify-between gap-4 pr-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="from-accent/70 to-accent/30 border-accent inline-flex size-10 items-center justify-center rounded-lg border bg-gradient-to-tr text-black/80">
            <MouseButtonLeft className="size-5" />
          </span>
          <div className="flex flex-col items-start justify-center">
            <h2 className="text-primary flex items-center justify-center gap-2 text-base leading-none font-medium tracking-tight">
              <span className="relative inline-flex size-2 items-center justify-center">
                <span className="absolute inline-flex size-[170%] rounded-full bg-emerald-400/25 blur-xs" />
                <span className="absolute inline-flex size-full rounded-full border border-emerald-400/70" />
                <span className="animate-live-blip relative inline-flex size-[80%] rounded-full bg-gradient-to-tr from-emerald-300 to-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.85)] duration-1000 ease-linear" />
              </span>
              Live Click Counter
            </h2>
            <p className="text-muted-foreground mt-1 text-xs">
              The realtime link click counter
            </p>
          </div>
        </div>

        <div className="font-doto flex flex-col items-center justify-center rounded-full p-2 text-2xl leading-none font-black text-white/90 md:text-6xl">
          <AnimatedCounter
            value={counterValue}
            includeDecimals={false}
            fontSize="44px"
            color="inherit"
            containerStyles={{
              margin: "0 auto",
            }}
          />
          <span className="text-accent font-mono text-xs font-normal">
            [total clicks]
          </span>
        </div>
      </div>
    </section>
  );
}

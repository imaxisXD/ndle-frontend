"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { Badge } from "@ui/badge";
import { cn } from "@/lib/utils";
import { SHORT_DOMAIN } from "./sample-data";
import { StageGlow } from "./stage-glow";

/* The two emails ndle sends when a link breaks and when it comes back, for
   the alert stop of the tour. */

export function AlertInbox() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  // 0 calm · 1 the down email is urgent (light turns red) · 2 recovery email arrives
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setPhase(2);
      return;
    }
    const timers = [window.setTimeout(() => setPhase(1), 500), window.setTimeout(() => setPhase(2), 2100)];
    return () => timers.forEach(window.clearTimeout);
  }, [inView, reduce]);

  return (
    <div ref={ref} className="relative isolate">
      <StageGlow tone={phase === 1 ? "red" : "amber"} className="-inset-x-12 -inset-y-6 -z-10 opacity-75" />
      <p aria-label="3:04 AM" className="font-doto roundness-100 font-black flex items-baseline gap-3 leading-none text-[var(--fg)]">
        <span className="text-[clamp(3.5rem,8vw,6rem)] tracking-[-0.01em]">
          03<span className="h2-colon relative -top-[0.06em] font-mono text-[0.7em] font-normal text-[oklch(0.72_0.16_82)]">:</span>04
        </span>
        <span className="font-mono text-sm font-normal text-[var(--fg-3)]">AM</span>
      </p>

      <div className="mt-6 font-mono">
        <Email
          tail
          urgent={phase === 1}
          subject={
            <>
              <Badge variant="red" label="DOWN" className="mr-2 px-1.5 py-0 align-middle text-xs" />
              {SHORT_DOMAIN}/launch is not responding
            </>
          }
          time="03:04 AM"
        >
          <p>
            One of your short links, <strong>{SHORT_DOMAIN}/launch</strong>, stopped responding at{" "}
            <strong>03:04 AM UTC</strong>.
          </p>
          <ul className="space-y-0.5">
            <li>Error: 503 Service Unavailable</li>
            <li>Regions affected: 2 of 4</li>
          </ul>
          <p>We&apos;ll keep checking every 60 seconds and email you again when it&apos;s back.</p>
        </Email>

        <div
          className={cn(
            "relative mt-4 transition-[opacity,transform,filter] duration-500 ease-out lg:mt-[-2.5rem] lg:ml-16",
            phase >= 2 ? "translate-y-0 opacity-100 blur-0" : "translate-y-4 opacity-0 blur-[6px]",
          )}
        >
          <Email
            compact
            subject={
              <>
                <Badge variant="green" label="RECOVERED" className="mr-2 px-1.5 py-0 align-middle text-xs" />
                {SHORT_DOMAIN}/launch is back online
              </>
            }
            time="03:08 AM"
          >
            <p>Back at 03:08 AM UTC after 4m 12s. Nothing for you to do.</p>
          </Email>
        </div>
      </div>
    </div>
  );
}

function Email({
  subject,
  time,
  compact,
  tail,
  urgent,
  children,
}: {
  subject: ReactNode;
  time: string;
  compact?: boolean;
  /** Leave room at the bottom for the next email to overlap. */
  tail?: boolean;
  /** Freshly arrived: a red ring, the way an unread alert sits in the inbox. */
  urgent?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-[14px] bg-white text-[oklch(0.2_0.006_85)] transition-shadow duration-500",
        urgent
          ? "shadow-[0_0_0_1.5px_oklch(0.64_0.2_27/0.7),0_2px_8px_rgba(180,40,30,0.12)]"
          : "shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_2px_8px_rgba(0,0,0,0.07)]",
      )}
    >
      <header className="border-b border-black/[0.07] px-6 py-4">
        <div className="flex items-center justify-between gap-3 text-xs text-[oklch(0.45_0_0)]">
          <span>
            <span className="font-medium text-[oklch(0.25_0_0)]">ndle monitoring</span> to you@team.com
          </span>
          <span className="whitespace-nowrap tabular-nums">{time}</span>
        </div>
        <h3 className="mt-2 text-base leading-snug font-semibold">{subject}</h3>
      </header>
      <div className={cn("space-y-3 px-6 text-sm leading-6", compact ? "py-4" : "py-5", tail && "lg:pb-14")}>
        {children}
      </div>
    </article>
  );
}

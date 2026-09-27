"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

/* The pivot line, set large on the page itself, right before the table that
   proves it. Words light up as you scroll: the other shorteners' half settles
   in grey, ndle's half in ink, and the last word takes the sign face with its
   LED full stop, which turns red: the one light you want ndle to show you. */

const OTHERS = "Other shorteners count clicks.".split(" ");
const OURS = "ndle tells you when clicks".split(" ");
const UNLIT = "#cbc9c2";
const GREY = "#8d8a82";
const INK = "#1b1915";
// Hex, not oklch: motion can only interpolate hex, rgb and hsl colours.
const RED = "#f13936"; // oklch(0.63 0.22 27), the alert LED
const TOTAL = OTHERS.length + OURS.length + 1;

export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = !!useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });

  return (
    <section aria-label="Why ndle" className="mx-auto max-w-[1240px] px-5 pt-32 pb-8 sm:px-8 lg:pt-44">
      <p
        ref={ref}
        className="mx-auto max-w-[17ch] text-center text-[clamp(2.4rem,5.6vw,4.9rem)] leading-[1.02] font-medium tracking-[-0.038em] text-balance"
      >
        {OTHERS.map((w, i) => (
          <Word key={`o${i}`} index={i} to={GREY} progress={scrollYProgress} still={reduce}>
            {w}
          </Word>
        ))}
        {OURS.map((w, i) => (
          <Word key={`n${i}`} index={OTHERS.length + i} to={INK} progress={scrollYProgress} still={reduce}>
            {w}
          </Word>
        ))}
        <Word index={TOTAL - 1} to={INK} progress={scrollYProgress} still={reduce} sign>
          break
        </Word>
      </p>
    </section>
  );
}

function Word({
  index,
  to,
  progress,
  still,
  sign = false,
  children,
}: {
  index: number;
  to: string;
  progress: MotionValue<number>;
  still: boolean;
  /** The closing word: dot face, then an LED full stop that lights red. */
  sign?: boolean;
  children: string;
}) {
  const start = index / (TOTAL + 2);
  const end = (index + 3) / (TOTAL + 2);
  const color = useTransform(progress, [start, end], [UNLIT, to]);
  const led = useTransform(progress, [start + 0.08, end], [UNLIT, RED]);

  if (!sign) {
    // Reduced motion gets plain spans: nothing is bound to scroll at all.
    return (
      <>
        {still ? <span style={{ color: to }}>{children}</span> : <motion.span style={{ color }}>{children}</motion.span>}{" "}
      </>
    );
  }
  return (
    <span className="whitespace-nowrap">
      {still ? (
        <>
          <span className="h2-sign text-[1.04em]" style={{ color: to }}>
            {children}
          </span>
          <span aria-hidden className="h2-led h2-led-alert" />
        </>
      ) : (
        <>
          <motion.span className="h2-sign text-[1.04em]" style={{ color }}>
            {children}
          </motion.span>
          <motion.span aria-hidden className="h2-led h2-led-alert" style={{ backgroundColor: led }} />
        </>
      )}
      <span className="sr-only">.</span>
    </span>
  );
}

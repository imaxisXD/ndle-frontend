"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/* Shared by the features bento and the close. */

/** A loop clock for a picture on the page: ms into the current loop while
    it's in view, -1 before it first shows, and `settled` (the frame that says
    the most, held still) with reduced motion. Ticks every 40ms; heavy
    children should be memoized so only what changes redraws. */
export function useLoopTime(loop: number, settled = Number.POSITIVE_INFINITY) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useStillAfterMount();
  const [t, setT] = useState(-1);

  useEffect(() => {
    if (!inView || reduce) return;
    const start = performance.now();
    const id = window.setInterval(() => setT((performance.now() - start) % loop), 40);
    return () => window.clearInterval(id);
  }, [inView, reduce, loop]);

  return { ref, t: reduce ? settled : t };
}

/** Reduced motion, but only once mounted. The server can't know the
    setting, so the first client render must match it (false); reading it
    straight away would change what the first render draws and break
    hydration. */
export function useStillAfterMount() {
  const reduce = useReducedMotion();
  const [still, setStill] = useState(false);
  useEffect(() => setStill(!!reduce), [reduce]);
  return still;
}

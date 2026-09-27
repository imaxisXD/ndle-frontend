"use client";

import { useLayoutEffect, type RefObject } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import { cn } from "@/lib/utils";
import { useDemo } from "./demo-clock";
import { CURSOR, CURSOR_MOVE_TIMES, STAGE, T, between, lastAt } from "./demo-script";

/* The pointer that drives the demo. It aims at `data-demo` elements on the
   stage, measured when each move starts, so it follows the layout instead of
   hard-coded coordinates. Positions are in stage units: the stage is scaled
   to fit, and the pointer scales with it. */

/** How long the click ripple runs. */
const RIPPLE_MS = 450;

type Move = (typeof CURSOR.moves)[number];

function aim(stage: HTMLElement | null, move: Move) {
  const target = stage?.querySelector(`[data-demo="${move.to}"]`);
  if (!stage || !target) return null;
  const box = stage.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const scale = box.width / STAGE.width;
  const ax = "ax" in move ? move.ax : 0.5;
  const ay = "ay" in move ? move.ay : 0.5;
  return {
    x: (rect.left - box.left + rect.width * ax) / scale,
    y: (rect.top - box.top + rect.height * ay) / scale,
  };
}

export function DemoCursor({ stageRef }: { stageRef: RefObject<HTMLDivElement | null> }) {
  const reduce = useReducedMotion();
  const move = useDemo((t) => lastAt(CURSOR_MOVE_TIMES, t));
  const shown = useDemo((t) => between(t, T.cursorIn, T.cursorOut));
  const click = useDemo((t) => {
    const i = lastAt(CURSOR.clicks, t);
    return i >= 0 && t - CURSOR.clicks[i] < RIPPLE_MS ? i : -1;
  });
  const x = useSpring(CURSOR.enter.x, CURSOR.spring);
  const y = useSpring(CURSOR.enter.y, CURSOR.spring);

  useLayoutEffect(() => {
    const point = move < 0 ? CURSOR.enter : aim(stageRef.current, CURSOR.moves[move]);
    if (!point) return;
    // While hidden (or for reduced motion) it jumps; on screen it glides.
    if (reduce || !shown) {
      x.jump(point.x);
      y.jump(point.y);
    } else {
      x.set(point.x);
      y.set(point.y);
    }
  }, [move, shown, reduce, stageRef, x, y]);

  return (
    <motion.div aria-hidden className="pointer-events-none absolute top-0 left-0 z-20" style={{ x, y }}>
      <div className={cn("transition-opacity duration-300", shown ? "opacity-100" : "opacity-0")}>
        {click >= 0 && <span key={`ripple-${click}`} className="h2-ripple absolute -top-3.5 -left-3.5 size-7 rounded-full" />}
        <svg
          key={`arrow-${click}`}
          width="20"
          height="22"
          viewBox="0 0 20 22"
          className={cn("relative -top-[1.5px] -left-[2px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.28)]", click >= 0 && "h2-press")}
        >
          <path
            d="M2 1.5V17.6l4.3-4 2.9 6.6 2.9-1.3-2.8-6.4H15.2Z"
            fill="#141312"
            stroke="#fff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </motion.div>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useAnimate, useReducedMotion, type Transition } from "motion/react";
import { Colored, Halftones, INK, PALETTES, Sticker, ink, useIds } from "./dot-doodles";

/* Blip, ndle's mascot: a one-eyed bot with a recording light, always
   watching your links, and the one who answers in the AI chart builder.
   Named for what it catches: the blip when a link goes down. Drawn in the
   dotted doodles' hand (dot-doodles.tsx), in violet; its line is the
   doodles' made steadier, one smooth pass round the head that runs a little
   past where it began.

   It has six moods, and moves between them rather than swapping faces: the
   pupil travels, the eye widens or closes, and the head cocks, hops or sways.
   Between two open-eyed moods it blinks, so a new face never just appears.

     curious    head cocked, brow up, eye up at the question, a small "o"
     thinking   eye reading side to side through the data, thought bubbles
                rising, the light pulsing
     alert      eye wide, pupil a pinprick, alarm ticks off the head: found
                something
     surprised  eye wide, pupil big, an "O", and a hop
     happy      eye closed in a smile, blush, a bob
     smitten    a heart for a pupil, blush, a sway

   Reduced motion gets each mood's face, still. */

export type Mood = "curious" | "thinking" | "alert" | "surprised" | "happy" | "smitten";

const P = PALETTES.violet;
const RED = "#f13936";
const WHITE = "#ffffff";

/* The head, on the doodles' 64 × 64 box, centred at (32, 36). */
const HEAD = {
  // From the upper left, round clockwise, and on past the start
  outline:
    "M17.2 26.4 C19.6 19.4 25 15.2 32.2 15.1 C39.6 15 45.2 19.2 47.6 26 C49.2 30.6 49.4 40.6 48 46.4 C46.2 53.6 40.4 57.2 32.4 57.2 C24.2 57.2 18.2 53.4 16.2 46.6 C14.8 41.4 14.9 31.6 16.6 27.4 C16.9 25.6 17.4 24 18.2 22.6",
  fill: "M18.6 27.4 C20.8 21 25.6 16.8 32.2 16.7 C38.8 16.6 43.8 20.4 46 26.4 C47.6 30.8 47.8 40.2 46.4 45.8 C44.8 52.2 39.6 55.6 32.4 55.6 C25 55.6 19.8 52.2 18 46.2 C16.6 41.4 16.8 32 18.6 27.4 Z",
  shade: "M64 24 C52 38 40 48 20 64 L64 64 Z",
  shine: "M20.8 30.2 C21.2 26 23.6 22.4 27.4 20.8",
  antenna: "M32.2 15.4 V8.6",
};

/* The eye, per mood: where the pupil sits and its radius, and the eye's own
   radius. Thinking's pupil reads between SCAN's ends instead. */
const EYE: Record<Mood, { x: number; y: number; r: number; eye: number }> = {
  curious: { x: 35, y: 30.6, r: 4.8, eye: 9.4 },
  thinking: { x: 29, y: 31.2, r: 4.4, eye: 9.4 },
  alert: { x: 32, y: 33, r: 2.6, eye: 10.2 },
  surprised: { x: 32, y: 33, r: 6.2, eye: 10.2 },
  happy: { x: 32.6, y: 33.4, r: 5.4, eye: 9.4 },
  smitten: { x: 32.4, y: 33.4, r: 5.4, eye: 9.4 },
};
const SCAN = { from: 28.2, to: 35.8, every: 1.4 };

/* The whole head's move into each mood, from its foot. */
const BODY: Record<Mood, { animate: { rotate?: number | number[]; y?: number | number[]; scaleY?: number | number[] }; transition: Transition }> =
  {
    curious: { animate: { rotate: 7, y: 0, scaleY: 1 }, transition: { type: "spring", stiffness: 300, damping: 16 } },
    thinking: { animate: { rotate: -3, y: 0, scaleY: 1 }, transition: { type: "spring", stiffness: 260, damping: 20 } },
    alert: { animate: { rotate: 0, y: [0, -2.4, 0], scaleY: [1, 1.05, 1] }, transition: { duration: 0.3, ease: "easeOut" } },
    surprised: { animate: { rotate: 0, y: [0, -4, 0], scaleY: [1, 1.08, 0.97, 1] }, transition: { duration: 0.45, ease: "easeOut" } },
    happy: { animate: { rotate: 0, y: [0, -1.6, 0], scaleY: 1 }, transition: { duration: 0.4, ease: "easeOut" } },
    smitten: { animate: { rotate: [0, -6, 5, 0], y: 0, scaleY: 1 }, transition: { duration: 0.7, ease: "easeInOut" } },
  };

const SPRING: Transition = { type: "spring", stiffness: 420, damping: 24 };
const FADE: Transition = { duration: 0.18, ease: "easeOut" };
const BLINK = { scaleY: [1, 0.1, 1] };

const HEART = "M0 -1.6 C-1.6 -4.4 -5.8 -3.6 -5.6 -0.4 C-5.4 2.2 -2.6 3.8 0 6 C2.6 3.8 5.4 2.2 5.6 -0.4 C5.8 -3.6 1.6 -4.4 0 -1.6 Z";
const pen = { stroke: INK, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
/* Scaled and faded from its own middle. */
const own = { transformBox: "fill-box", originX: 0.5, originY: 0.5 } as const;

export function Blip({ mood, className }: { mood: Mood; className?: string }) {
  const ids = useIds();
  const still = !!useReducedMotion();
  const body = BODY[mood];
  return (
    <Sticker className={className}>
      <defs>
        <Halftones ids={ids} p={P} />
      </defs>
      {/* Off the head, so they don't swing with it */}
      <Bubbles on={mood === "thinking"} still={still} />
      <Ticks on={mood === "alert"} still={still} />
      <motion.g
        style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
        initial={false}
        animate={still ? { rotate: 0, y: 0, scaleY: 1 } : body.animate}
        transition={still ? { duration: 0 } : body.transition}
      >
        <path d={HEAD.antenna} {...ink} />
        {/* The recording light: pulsing while it thinks, flashing when it's alert */}
        <motion.circle
          cx={32.2}
          cy={6.6}
          r={2.8}
          fill={RED}
          {...ink}
          strokeWidth={2}
          style={own}
          initial={false}
          animate={
            still ? { opacity: 1, scale: 1 } : mood === "thinking" ? { opacity: [1, 0.35, 1], scale: 1 } : mood === "alert" ? { opacity: 1, scale: [1, 1.45, 1] } : { opacity: 1, scale: 1 }
          }
          transition={mood === "thinking" ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }}
        />
        <Colored d={HEAD.fill} shade={HEAD.shade} ids={ids} p={P} />
        <path d={HEAD.shine} stroke={P.shine} strokeWidth={2.8} strokeLinecap="round" />
        <path d={HEAD.outline} {...ink} />
        <Face mood={mood} still={still} />
      </motion.g>
    </Sticker>
  );
}

function Face({ mood, still }: { mood: Mood; still: boolean }) {
  const eye = EYE[mood];
  const open = mood !== "happy";
  const smitten = mood === "smitten";
  const scanning = mood === "thinking" && !still;
  const blink = useBlink(mood, open, still);
  const at = (x: number) => (scanning ? [null, SCAN.to + x, SCAN.from + x] : eye.x + x);
  const glide: Transition = still ? { duration: 0 } : SPRING;
  const move: Transition = scanning ? { duration: SCAN.every, repeat: Infinity, ease: "easeInOut" } : glide;
  const glint = { dx: -eye.r * 0.38, dy: -eye.r * 0.4, r: Math.max(0.9, eye.r * 0.3) };

  return (
    <>
      {/* The brow, raised when curious */}
      <motion.path
        d="M24.6 21.6 C28.6 19.2 33.4 18.6 38.6 19.6"
        {...pen}
        strokeWidth={2.4}
        initial={false}
        animate={{ opacity: mood === "curious" ? 1 : 0, y: mood === "curious" ? 0 : 2.5 }}
        transition={still ? { duration: 0 } : FADE}
      />
      {/* The eye: it closes into happy's smile, and blinks */}
      <motion.g
        style={own}
        initial={false}
        animate={{ scaleY: open ? 1 : 0.06, opacity: open ? 1 : 0 }}
        transition={still ? { duration: 0 } : { duration: 0.16, ease: "easeInOut" }}
      >
        <g ref={blink} className="origin-center [transform-box:fill-box]">
          <motion.circle cx={32} cy={33} fill={WHITE} {...ink} strokeWidth={2.4} initial={false} animate={{ r: eye.eye }} transition={glide} />
          <motion.circle
            fill={INK}
            initial={false}
            animate={{ cx: at(0), cy: eye.y, r: eye.r, opacity: smitten ? 0 : 1 }}
            transition={{ default: glide, cx: move, opacity: FADE }}
          />
          <motion.circle
            fill={WHITE}
            initial={false}
            animate={{ cx: at(glint.dx), cy: eye.y + glint.dy, r: glint.r, opacity: smitten ? 0 : 1 }}
            transition={{ default: glide, cx: move, opacity: FADE }}
          />
          {/* Smitten's pupil */}
          <g transform="translate(32.4 33.4)">
            <motion.path
              d={HEART}
              fill={RED}
              stroke={INK}
              strokeWidth={1.6}
              style={own}
              initial={false}
              animate={{ scale: smitten ? 0.95 : 0 }}
              transition={still ? { duration: 0 } : smitten ? { type: "spring", stiffness: 520, damping: 13 } : FADE}
            />
          </g>
        </g>
      </motion.g>
      {/* Happy's closed eye, drawn once the open one has shut */}
      <motion.path
        d="M24.2 35.6 C26.6 28.4 37.4 28.4 39.8 35.6"
        {...pen}
        strokeWidth={3}
        style={{ transformBox: "fill-box", originX: 0.5, originY: 1 }}
        initial={false}
        animate={{ opacity: open ? 0 : 1, scaleY: open ? 0.4 : 1 }}
        transition={still ? { duration: 0 } : { duration: 0.16, delay: open ? 0 : 0.1 }}
      />
      <Mouth mood={mood} still={still} />
      {/* Blush, when it's pleased */}
      <motion.g initial={false} animate={{ opacity: mood === "happy" || smitten ? 0.55 : 0 }} transition={still ? { duration: 0 } : FADE}>
        <ellipse cx={21.4} cy={42.4} rx={2.8} ry={1.7} fill={P.dots} />
        <ellipse cx={42.6} cy={42.4} rx={2.8} ry={1.7} fill={P.dots} />
      </motion.g>
    </>
  );
}

/* One mouth per mood, each grown in from its own middle as the last shrinks
   away. */
function Mouth({ mood, still }: { mood: Mood; still: boolean }) {
  const shapes: Array<{ moods: Mood[]; el: ReactNode }> = [
    { moods: ["curious"], el: <circle cx={33} cy={47.6} r={1.9} {...pen} strokeWidth={2} /> },
    { moods: ["thinking"], el: <path d="M28.2 48 L36.2 46.2" {...pen} strokeWidth={2.2} /> },
    { moods: ["alert"], el: <ellipse cx={32} cy={48} rx={2.4} ry={2.8} fill={INK} /> },
    { moods: ["surprised"], el: <circle cx={32} cy={48.4} r={2.6} {...pen} strokeWidth={2.2} /> },
    { moods: ["happy", "smitten"], el: <path d="M26.8 45.2 C29.6 49.4 34.4 49.4 37.2 45.2" {...pen} strokeWidth={2.2} /> },
  ];
  return shapes.map(({ moods, el }) => {
    const on = moods.includes(mood);
    return (
      <motion.g
        key={moods[0]}
        style={own}
        initial={false}
        animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0.4 }}
        transition={still ? { duration: 0 } : { ...FADE, delay: on ? 0.06 : 0 }}
      >
        {el}
      </motion.g>
    );
  });
}

/* Thinking's bubbles, rising off the head's upper right one after another. */
const BUBBLES = [
  { cx: 50.6, cy: 24.6, r: 1.2 },
  { cx: 54, cy: 19.4, r: 1.7 },
  { cx: 57.8, cy: 13.2, r: 2.4 },
];

function Bubbles({ on, still }: { on: boolean; still: boolean }) {
  return BUBBLES.map((bubble, i) => (
    <motion.circle
      key={bubble.cy}
      {...bubble}
      fill={WHITE}
      {...ink}
      strokeWidth={1.6}
      style={own}
      initial={false}
      animate={{ opacity: on ? 1 : 0, scale: on ? 1 : 0 }}
      transition={still ? { duration: 0 } : on ? { type: "spring", stiffness: 520, damping: 16, delay: 0.1 + i * 0.12 } : FADE}
    />
  ));
}

/* Alert's ticks, sprung out from the head's sides. */
function Ticks({ on, still }: { on: boolean; still: boolean }) {
  return (["M13.4 22 L10.2 19.2 M12 28.4 L8.2 27.6", "M50.6 22 L53.8 19.2 M52 28.4 L55.8 27.6"] as const).map((d, i) => (
    <motion.path
      key={d}
      d={d}
      {...ink}
      strokeWidth={2}
      initial={false}
      animate={{ opacity: on ? 1 : 0, x: on ? 0 : i === 0 ? 2.5 : -2.5 }}
      transition={still ? { duration: 0 } : on ? { type: "spring", stiffness: 600, damping: 15 } : FADE}
    />
  ));
}

/** Blinks between two open-eyed moods, so a new face doesn't just appear,
    and now and then on its own. Returns the ref for the eye's group. */
function useBlink(mood: Mood, open: boolean, still: boolean) {
  const [scope, animate] = useAnimate<SVGGElement>();
  const last = useRef(mood);

  useEffect(() => {
    const was = last.current;
    last.current = mood;
    if (still || was === mood || !open || was === "happy") return;
    animate(scope.current, BLINK, { duration: 0.18, ease: "easeInOut" });
  }, [mood, open, still, animate, scope]);

  useEffect(() => {
    if (still || !open) return;
    const id = window.setInterval(() => animate(scope.current, BLINK, { duration: 0.16, ease: "easeInOut" }), 3400);
    return () => window.clearInterval(id);
  }, [open, still, animate, scope]);

  return scope;
}

/* ─────────────────────────────────────────────────────────
 * THE ASK   (ms after each change; see ask-card.tsx)
 *
 *  The question posts
 *      0   curious: it looks up at the question
 *    450   thinking: it reads through the data, bubbles rising
 *  The answer lands
 *      0   alert: it's found something
 *    300   surprised: the chart draws
 *    750   happy, and stays
 *  Hovered: smitten, while the pointer's on it
 *
 *  Already answered when it appears: happy at once.
 * ───────────────────────────────────────────────────────── */

const ASKED: Array<[Mood, number]> = [["thinking", 450]];
const ANSWERED: Array<[Mood, number]> = [
  ["alert", 0],
  ["surprised", 300],
  ["happy", 750],
];

/** Blip through an ask: thinking once the question posts, pleased
    once the answer lands. */
export function AskBlip({ answered, className }: { answered: boolean; className?: string }) {
  const still = !!useReducedMotion();
  const [beat, setBeat] = useState<Mood>(answered ? "happy" : "curious");
  const [hovered, setHovered] = useState(false);
  const was = useRef(answered);

  useEffect(() => {
    const changed = was.current !== answered;
    was.current = answered;
    if (still) return;
    // On first showing an answered ask, it's already happy
    const steps = answered ? (changed ? ANSWERED : []) : changed ? [["curious", 0] as [Mood, number], ...ASKED] : ASKED;
    const timers = steps.map(([mood, at]) => window.setTimeout(() => setBeat(mood), at));
    return () => timers.forEach(window.clearTimeout);
  }, [answered, still]);

  const mood: Mood = hovered ? "smitten" : still ? (answered ? "happy" : "thinking") : beat;
  return (
    <span
      className="inline-flex shrink-0"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <Blip mood={mood} className={className} />
    </span>
  );
}

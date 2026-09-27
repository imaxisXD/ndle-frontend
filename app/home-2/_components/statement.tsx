"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { motion, useAnimate, useInView } from "motion/react";
import { AnimatedMetricNumber } from "@/components/animated-metric-number";
import { LiveDot } from "@/components/ui/live-dot";
import { cn } from "@/lib/utils";
import { PointerGlyph } from "./demo-cursor";
import { bebas } from "./fonts";
import { FOCUS } from "./kit";
import { useStillAfterMount } from "./use-loop-time";

/* The pivot line, set large on the page itself, right before the plans that
   prove it, in the bento's tall capitals: the other shorteners' half in
   grey, ndle's half in ink. Each time it comes into view it acts itself out,
   in order, and scrolling away resets it for next time:

     clicks   the hero's pointer taps it a few times; a click count on its
              side, dressed like the dashboard's Live Click Counter (black,
              the green live dot, the dot-face number that rolls), goes up
              with each tap. It's a real button: every click squashes the word, sends
              a ripple out from the click and adds one
     ndle     a black highlighter swipes in behind it and it turns into the
              Signal Yellow wordmark; two small hand-drawn hearts pop onto
              its corner and beat once
     break    a crack runs down its middle, the halves snap apart and chips
              fall out; the red alert LED lights as its full stop, and a
              yellow ring is drawn around it: caught. Hover it (or tap it)
              and a small cross bandage slaps on over the crack

   Clicks are counted on the page only; nothing is sent anywhere. Reduced
   motion gets the finished line, still, and the button still counts. */

/* ─────────────────────────────────────────────────────────
 * STORYBOARD   (s after the line comes into view)
 *
 *  0.25   the pointer taps "clicks", every 0.32 (five taps): each tap
 *         squashes the word and rolls the count up one, "+1" rising
 *  1.00   ndle's highlighter swipes in (0.45)
 *  1.40   two hand-drawn hearts pop onto its corner, then beat once
 *  1.70   "break": the crack draws down the middle (0.3)
 *  1.80   the pointer fades out
 *  2.00   the halves snap apart, chips fall
 *  2.25   the red LED full stop lights
 *  2.45   the yellow ring draws around it (0.7)
 *
 *  Out of view: back to the start, for the next time it comes in.
 * ───────────────────────────────────────────────────────── */

const GREY = "#8d8a82";
const INK = "#1b1915";
const SIG = "var(--sig)";
const RED = "#f13936"; // oklch(0.63 0.22 27), the alert LED
const UNLIT = "#cbc9c2"; // the LED before it lights

const DEMO = { first: 0.25, every: 0.32, taps: 5, fadeAt: 1.8 };
const NDLE_AT = 1.0;
const BREAK = { at: 1.7, crack: 0.3, split: 0.3, led: 0.55, ring: 0.75, ringFor: 0.7 };
const SPLIT_SPRING = { type: "spring" as const, stiffness: 320, damping: 13, mass: 0.8 };

/* A word pressed like a button: in a little, then back past where it was. */
const PRESS = { scale: [1, 0.93, 1.03, 1], duration: 0.32 };

/* The click count starts here; every tap adds one. */
const COUNT_FROM = 1_203;

/* Where the standing count's foot sits: the baseline of "clicks.", as a
   share of the word's box (a percentage, so it isn't read against the
   count's own small font). */
const CHIP_BASELINE = "83%";

/* The ring's stroke scales with the type, with a floor for small screens. */
const RING_STROKE = "max(3.5px, 0.055em)";

export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const still = useStillAfterMount();
  // Plays while the line is in view; leaving resets it for next time.
  const inView = useInView(ref, { amount: 0.5 });
  const playing = still || inView;

  return (
    <section aria-label="Why ndle" className={cn(bebas.variable, "mx-auto max-w-[1240px] px-5 pt-8 pb-8 sm:px-8 lg:pt-12")}>
      <p
        ref={ref}
        className="mx-auto max-w-[16ch] text-center font-[family-name:var(--font-bebas)] text-[clamp(3.25rem,8.5vw,7.5rem)] leading-[0.96] tracking-[-0.01em] text-balance uppercase"
      >
        <span style={{ color: GREY }}>Other shorteners count </span>
        <Clicks playing={playing} still={still} /> <Ndle lit={playing} still={still} />{" "}
        <span style={{ color: INK }}>catches the links that </span>
        <Break broken={playing} still={still} />
      </p>
    </section>
  );
}

/* ───────── clicks: a button that counts the way the dashboard counts ───────── */

type Ripple = { id: number; x: number; y: number };

function Clicks({ playing, still }: { playing: boolean; still: boolean }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  // Your clicks stay counted; the pointer's taps are for this showing only.
  const [yours, setYours] = useState(0);
  const [demo, setDemo] = useState(0);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  // Bumped on every tap, for the "+1" that rises off the count.
  const [bursts, setBursts] = useState(0);
  const rippleId = useRef(0);

  const press = useCallback(() => {
    if (still || !scope.current) return;
    animate(scope.current, { scale: PRESS.scale }, { duration: PRESS.duration, ease: "easeOut" });
  }, [animate, scope, still]);

  // The pointer's taps, each time the line comes into view.
  useEffect(() => {
    if (!playing || still) {
      setDemo(0);
      return;
    }
    const timers = Array.from({ length: DEMO.taps }, (_, i) =>
      window.setTimeout(
        () => {
          setDemo(i + 1);
          setBursts((b) => b + 1);
          press();
        },
        (DEMO.first + i * DEMO.every) * 1000,
      ),
    );
    return () => timers.forEach(window.clearTimeout);
  }, [playing, still, press]);

  const click = (event: MouseEvent<HTMLButtonElement>) => {
    setYours((n) => n + 1);
    setBursts((b) => b + 1);
    press();
    if (still) return;
    // The ripple starts where you clicked (keyboard clicks start mid-word).
    const box = event.currentTarget.getBoundingClientRect();
    const fromKeyboard = event.detail === 0;
    const ripple = {
      id: ++rippleId.current,
      x: fromKeyboard ? box.width / 2 : event.clientX - box.left,
      y: fromKeyboard ? box.height / 2 : event.clientY - box.top,
    };
    setRipples((r) => [...r.slice(-4), ripple]);
    window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== ripple.id)), 600);
  };

  const count = COUNT_FROM + yours + (still ? DEMO.taps : demo);
  const shown = still || demo > 0 || yours > 0;

  return (
    <button
      type="button"
      onClick={click}
      aria-label={`clicks (press to count one, ${count.toLocaleString("en-US")} so far)`}
      className={cn(
        "relative inline-block cursor-pointer rounded-[0.06em] bg-transparent p-0 text-[#8d8a82] uppercase transition-colors duration-150 hover:text-[#6f6c65] [-webkit-tap-highlight-color:transparent]",
        FOCUS,
      )}
    >
      <span ref={scope} className="inline-block origin-center">
        clicks.
      </span>

      {/* Ripples from each click */}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="h2-ripple pointer-events-none absolute size-[0.5em] rounded-full"
          style={{ left: r.x, top: r.y, marginLeft: "-0.25em", marginTop: "-0.25em", animationDuration: "550ms" }}
        />
      ))}

      {/* The count. From lg it stands up straight beside the word, as tall as
          its capitals and reading bottom to top, a spine of type; the gap
          between "shorteners" and "the" is exactly one line tall, so it's
          sized to the caps, not past them. Below lg there's no room beside
          the word, so it sits on the word's top-right corner, sized with a
          floor so it stays readable. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute font-mono leading-none tracking-normal normal-case transition-[opacity,scale] duration-300 ease-out",
          "top-[0.02em] left-[calc(100%-0.34em)] -translate-y-1/2 text-[max(12px,0.15em)]",
          "lg:top-[var(--cap-base)] lg:left-[calc(100%+0.7em)] lg:origin-top-left lg:translate-y-0 lg:-rotate-90 lg:text-[0.13em]",
          shown ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
        style={{ "--cap-base": CHIP_BASELINE } as CSSProperties}
      >
        {/* Dressed like the dashboard's Live Click Counter: black, the green
            live dot, and the count in the dot face */}
        <span className="flex items-center gap-[0.5em] rounded-full bg-[#141312] px-[0.7em] py-[0.42em] whitespace-nowrap text-white shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_6px_16px_-8px_rgba(0,0,0,0.5)]">
          {/* The Live Click Counter's green dot: this count is live. Each
              tap sends a green ping out of it. */}
          <span className="relative mr-[0.1em] inline-flex">
            <LiveDot className="size-[0.55em]" />
            {!still && bursts > 0 && <span key={bursts} className="h2-live-ping absolute inset-0 rounded-full border border-emerald-400" />}
          </span>
          <AnimatedMetricNumber
            animationKey="home2-statement-clicks"
            minWidthCh={0}
            value={count}
            className="font-doto roundness-100 text-[1.15em] leading-none font-black tabular-nums"
          />
        </span>
        {/* One "+1" per tap, rising off the count. When the count stands up,
            the "+1" sits past its top end, turned back upright. */}
        {!still && bursts > 0 && (
          <span
            key={bursts}
            className="absolute -top-[0.3em] right-[0.3em] lg:top-1/2 lg:right-auto lg:left-[calc(100%+0.3em)] lg:-translate-y-1/2 lg:rotate-90"
          >
            <span className="h2-plus-one block text-[1.1em] font-medium text-[#6f6c65]">+1</span>
          </span>
        )}
      </span>

      {/* The pointer, tapping, while the line plays */}
      {!still && playing && (
        <span
          aria-hidden
          className="pointer-events-none absolute top-[0.3em] right-[0.02em] text-[0.3em]"
          style={{ animation: `h2-fade-out 300ms ease-out ${DEMO.fadeAt}s both` }}
        >
          <span
            className="h2-ripple absolute -top-[0.7em] -left-[0.7em] size-[1.4em] rounded-full"
            style={{ animationDuration: `${DEMO.every}s`, animationDelay: `${DEMO.first}s`, animationIterationCount: DEMO.taps }}
          />
          <span
            className="block origin-top-left scale-[2.2]"
            style={{ animation: `h2-press ${DEMO.every}s cubic-bezier(0.33, 1, 0.68, 1) ${DEMO.first}s ${DEMO.taps} both` }}
          >
            <PointerGlyph />
          </span>
        </span>
      )}
    </button>
  );
}

/* ───────── ndle: highlighted, and turned into the wordmark ───────── */

function Ndle({ lit, still }: { lit: boolean; still: boolean }) {
  // The wordmark's own letters: lowercase, tight. The copy under the swipe is
  // built the same way, so the two sets of letters sit exactly on each other.
  const letters = "relative font-sans text-[0.92em] font-semibold tracking-[-0.05em] normal-case";
  const swiping = lit && !still;
  return (
    <span className="relative mx-[0.02em] inline-block -rotate-2 px-[0.14em]">
      <span className={letters} style={{ color: INK }}>
        ndle
      </span>
      {/* The highlighter: a black bar with the word in Signal Yellow, swiped
          in from the left on its beat; it clears at once when reset */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 px-[0.14em] ease-[cubic-bezier(0.65,0,0.35,1)]",
          swiping ? "transition-[clip-path] duration-[450ms]" : "transition-none",
        )}
        style={{ clipPath: lit ? "inset(0 0 0 0)" : "inset(0 100% 0 0)", transitionDelay: swiping ? `${NDLE_AT}s` : "0s" }}
      >
        <span className="absolute inset-x-0 top-[0.12em] bottom-[0.04em] rounded-[0.06em] bg-[#141312]" />
        <span className={letters} style={{ color: SIG }}>
          ndle
        </span>
      </span>
      <Hearts lit={lit} still={still} />
    </span>
  );
}

/* Two small hearts doodled on the label's corner, drawn the way a hand
   draws them: a wobbly ink outline whose ends cross at the tip where the pen
   closes, and orange laid on a touch off the line, like marker colouring.
   Each is shaded: a light orange shine on the upper lobe, and the page's
   dotted look, subtly, as halftone dots on the lower side. They pop on once
   the highlighter lands, then give one beat. Drawn on a 40 × 38 box. */

const HEART = {
  // The ink line, starting at the tip and overshooting it on the way back
  outline:
    "M21 35 C14.6 29.6 5.4 23.2 4.3 14.8 C3.5 8 8.4 3.7 13.4 4.4 C16.9 4.9 19.3 7.9 20.5 10.8 C21.9 6.7 25.9 3.4 30.5 4 C35.9 4.8 38.2 10.4 36.5 16.1 C34.6 22.8 27.3 29 19.4 36.6",
  // The colour, a closed shape set slightly off the line
  fill: "M20.6 33.4 C14.2 28.3 6.3 22.4 5.7 14.9 C5.3 9.3 9.3 6 13.4 6.5 C16.6 7 18.8 9.7 20.4 12.7 C22 8.7 25.8 5.7 29.9 6.2 C34.4 7 36.2 11.3 34.9 16 C33.3 21.8 27 27.6 20.6 33.4 Z",
  shine: "M9.2 12.6 C9.4 9.8 11.6 8.2 14 8.7",
  // Where the halftone shading falls: below a diagonal, the heart's shadow side
  shade: "M40 9 C34 21 25 30 8 40 L40 40 Z",
};

/* A dotted heart: a light orange base under a halftone of orange dots,
   heavier on the shadow side, and the shine on top. */
const HEART_COLOR = { base: "#ffab80", dots: "#f2622e", shadeDots: "#c9431a", shine: "#ffd9c2" };

/* A trail of ink dots floating up off the small heart, smaller as they rise,
   in the heart's own 40 × 38 box. */
const TRAIL = [
  { cx: 43, cy: 5, r: 1.9 },
  { cx: 48.5, cy: -0.5, r: 1.55 },
  { cx: 52.5, cy: -6.5, r: 1.2 },
  { cx: 55, cy: -13, r: 0.9 },
];
const TRAIL_EVERY = 0.07;

/* The pair: where each sits on the label's corner, its size and its tilt. */
const HEARTS = [
  { top: "-0.2em", left: "-0.24em", size: "0.36em", rotate: -16, delay: 0, trail: false },
  { top: "-0.31em", left: "0.06em", size: "0.25em", rotate: 14, delay: 0.1, trail: true },
];

/* One motion per heart: it pops on past full size and settles, then beats
   once (a big beat and a small one). */
const HEART_POP = {
  at: NDLE_AT + 0.4,
  spring: { type: "spring" as const, stiffness: 420, damping: 14 },
  scale: [0.2, 1.14, 0.95, 1, 1, 1.14, 1, 1.06, 1],
  times: [0, 0.16, 0.26, 0.34, 0.5, 0.62, 0.74, 0.86, 1],
  duration: 1.2,
};

function Hearts({ lit, still }: { lit: boolean; still: boolean }) {
  return (
    <>
      {HEARTS.map((heart, i) => (
        <DoodleHeart key={i} {...heart} lit={lit} still={still} />
      ))}
    </>
  );
}

function DoodleHeart({
  top,
  left,
  size,
  rotate,
  delay,
  trail,
  lit,
  still,
}: (typeof HEARTS)[number] & { lit: boolean; still: boolean }) {
  const id = useId().replace(/:/g, "");
  const ids = { heart: `ndle-heart-${id}`, shade: `ndle-shade-${id}`, dots: `ndle-dots-${id}`, shadeDots: `ndle-shade-dots-${id}` };
  const playing = lit && !still;
  const pop = HEART_POP.at + delay;

  const art = (
    <>
      <defs>
        <clipPath id={ids.heart}>
          <path d={HEART.fill} transform="translate(0.9 0.9)" />
        </clipPath>
        <clipPath id={ids.shade}>
          <path d={HEART.shade} />
        </clipPath>
        {/* The halftone: small dots all over, bigger and darker in shadow */}
        <pattern id={ids.dots} width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={1.5} cy={1.5} r={0.95} fill={HEART_COLOR.dots} />
        </pattern>
        <pattern id={ids.shadeDots} width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <circle cx={1.5} cy={1.5} r={1.25} fill={HEART_COLOR.shadeDots} />
        </pattern>
      </defs>
      {/* The colour, a touch off the line: a light base, then its dots */}
      <path d={HEART.fill} transform="translate(0.9 0.9)" fill={HEART_COLOR.base} />
      <g clipPath={`url(#${ids.heart})`}>
        <rect x={0} y={0} width={40} height={40} fill={`url(#${ids.dots})`} />
        <rect x={0} y={0} width={40} height={40} fill={`url(#${ids.shadeDots})`} clipPath={`url(#${ids.shade})`} />
      </g>
      {/* The light shade on the upper lobe */}
      <path d={HEART.shine} stroke={HEART_COLOR.shine} strokeWidth={3.2} strokeLinecap="round" />
      <circle cx={27.4} cy={10.2} r={1.3} fill={HEART_COLOR.shine} />
      {/* The ink line on top */}
      <path d={HEART.outline} stroke={INK} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
      {/* The dotted trail, one dot after another once the heart has popped */}
      {trail &&
        TRAIL.map((dot, i) =>
          still ? (
            <circle key={i} {...dot} fill={INK} />
          ) : (
            <motion.circle
              key={i}
              {...dot}
              fill={INK}
              initial={false}
              animate={{ opacity: playing ? 1 : 0 }}
              transition={playing ? { delay: pop + 0.25 + i * TRAIL_EVERY, duration: 0.12 } : INSTANT}
            />
          ),
        )}
    </>
  );

  const style = { top, left, width: size, height: size };
  const className = "pointer-events-none absolute overflow-visible";

  if (still) {
    return (
      <svg aria-hidden viewBox="0 0 40 38" className={className} style={{ ...style, rotate: `${rotate}deg` }} fill="none">
        {art}
      </svg>
    );
  }
  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 40 38"
      className={className}
      style={style}
      fill="none"
      initial={false}
      animate={playing ? { opacity: 1, scale: HEART_POP.scale, rotate } : { opacity: 0, scale: 0.2, rotate: 0 }}
      transition={
        playing
          ? {
              opacity: { delay: pop, duration: 0.12 },
              rotate: { ...HEART_POP.spring, delay: pop },
              scale: { delay: pop, duration: HEART_POP.duration, times: HEART_POP.times, ease: "easeInOut" },
            }
          : INSTANT
      }
    >
      {art}
    </motion.svg>
  );
}

/* ───────── break: cracked, split, and caught ───────── */

/* The crack, as the seam between two clip polygons, in % of the word's box. */
const SEAM: Array<[number, number]> = [[52, 0], [47, 24], [56, 46], [45, 70], [53, 100]];
const seam = SEAM.map(([x, y]) => `${x}% ${y}%`);
const LEFT = `polygon(0 0, ${seam.join(", ")}, 0 100%)`;
const RIGHT = `polygon(${seam.join(", ")}, 100% 100%, 100% 0)`;
const CRACK = `M${SEAM.map(([x, y]) => `${x} ${y}`).join(" L")}`;

/* Where the halves come to rest. */
const HALVES = {
  left: { x: "-0.03em", y: "0.02em", rotate: -4 },
  right: { x: "0.06em", y: "0.04em", rotate: 5 },
};

/* Chips that fall from the crack: where they start (% of the box) and how they fall. */
const CHIPS = [
  { left: 50, top: 30, size: 0.06, fall: "0.55em", spin: 80 },
  { left: 53, top: 55, size: 0.045, fall: "0.45em", spin: -120 },
  { left: 47, top: 76, size: 0.05, fall: "0.35em", spin: 140 },
];

/* Comic ticks bursting off the crack, in the word's 100 × 100 box. */
const TICKS = "M60 -18 L66 -34 M44 -16 L38 -32 M66 118 L74 132 M40 120 L32 134";

/* A quick hand-drawn ring, a little wider than the word. */
const RING = "M52 5C26 3 6 10 5 21c-1 10 18 16 46 15 27-1 46-9 45-18C95 9 76 3 50 5c-6 .4-11 1.4-15 3";

/* Beats, in s after the line comes into view. Resetting is instant. */
const at = (s: number) => BREAK.at + s;
const INSTANT = { duration: 0 };

/* Where the halves rest once the bandage holds them: nearly back
   together, the crack still showing past its ends. */
const MENDED = {
  left: { x: "-0.004em", y: "0em", rotate: -0.6 },
  right: { x: "0.01em", y: "0.006em", rotate: 0.8 },
};
const MEND_SPRING = { type: "spring" as const, stiffness: 420, damping: 22 };

/* A broken word you can mend: hover it (or tap it) and a cross bandage
   slaps on over the crack and pulls the halves together; leave and it
   peels off. */
function useMend(broken: boolean) {
  const [mended, setMended] = useState(false);
  // Once mended, the halves move on the bandage's spring, not the break's beat.
  const [touched, setTouched] = useState(false);
  const lastPointer = useRef("mouse");
  useEffect(() => {
    if (broken) return;
    setMended(false);
    setTouched(false);
  }, [broken]);

  const set = (next: boolean) => {
    if (!broken) return;
    setTouched(true);
    setMended(next);
  };
  const handlers = {
    onPointerDown: (e: { pointerType: string }) => (lastPointer.current = e.pointerType),
    onPointerEnter: (e: { pointerType: string }) => e.pointerType === "mouse" && set(true),
    onPointerLeave: (e: { pointerType: string }) => e.pointerType === "mouse" && set(false),
    // Touch has no hover: a tap puts the bandage on, and another takes it off.
    onClick: () => lastPointer.current !== "mouse" && set(!mended),
  };
  return { mended: broken && mended, touched, handlers };
}

function Break({ broken, still }: { broken: boolean; still: boolean }) {
  const { mended, touched, handlers } = useMend(broken);

  if (still) {
    const pose = mended ? MENDED : HALVES;
    return (
      <BreakFrame broken {...handlers}>
        {(["left", "right"] as const).map((side) => (
          <span
            key={side}
            aria-hidden
            className={cn("absolute inset-0", side === "left" ? "origin-bottom-left" : "origin-bottom-right")}
            style={{
              clipPath: side === "left" ? LEFT : RIGHT,
              transform: `translate(${pose[side].x}, ${pose[side].y}) rotate(${pose[side].rotate}deg)`,
            }}
          >
            break
          </span>
        ))}
        {mended && <Bandage on still />}
      </BreakFrame>
    );
  }

  return (
    <BreakFrame broken={broken} animated {...handlers}>
      {/* Whole until the split, then the two halves take over */}
      <motion.span
        aria-hidden
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: broken ? 0 : 1 }}
        transition={broken ? { delay: at(BREAK.split), duration: 0 } : INSTANT}
      >
        break
      </motion.span>
      {(["left", "right"] as const).map((side) => (
        <motion.span
          key={side}
          aria-hidden
          className={cn("absolute inset-0", side === "left" ? "origin-bottom-left" : "origin-bottom-right")}
          style={{ clipPath: side === "left" ? LEFT : RIGHT }}
          initial={false}
          animate={broken ? { opacity: 1, ...(mended ? MENDED : HALVES)[side] } : { opacity: 0, x: 0, y: 0, rotate: 0 }}
          transition={
            !broken
              ? INSTANT
              : touched
                ? { opacity: INSTANT, default: MEND_SPRING }
                : { opacity: { delay: at(BREAK.split), duration: 0 }, default: { ...SPLIT_SPRING, delay: at(BREAK.split) } }
          }
        >
          break
        </motion.span>
      ))}
      {/* The crack, drawn down the middle before it splits, and the ticks off it */}
      <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full overflow-visible" fill="none">
        <motion.path
          d={CRACK}
          stroke="#ffffff"
          strokeWidth={5}
          strokeLinejoin="bevel"
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={broken ? { pathLength: 1, opacity: 0 } : { pathLength: 0, opacity: 1 }}
          transition={
            broken
              ? { pathLength: { delay: at(0), duration: BREAK.crack, ease: "easeIn" }, opacity: { delay: at(BREAK.split + 0.15), duration: 0.2 } }
              : INSTANT
          }
        />
        <motion.path
          d={TICKS}
          stroke={INK}
          strokeWidth={4}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={false}
          animate={broken ? { opacity: [0, 1, 1, 0] } : { opacity: 0 }}
          transition={broken ? { delay: at(BREAK.split), duration: 0.9, times: [0, 0.1, 0.6, 1] } : INSTANT}
        />
      </svg>
      {CHIPS.map((chip) => (
        <motion.span
          key={chip.top}
          aria-hidden
          className="absolute rounded-[0.01em] bg-[#1b1915]"
          style={{ left: `${chip.left}%`, top: `${chip.top}%`, width: `${chip.size}em`, height: `${chip.size}em` }}
          initial={false}
          animate={broken ? { opacity: [0, 1, 0], y: chip.fall, rotate: chip.spin } : { opacity: 0, y: 0, rotate: 0 }}
          transition={broken ? { delay: at(BREAK.split), duration: 0.8, ease: "easeIn" } : INSTANT}
        />
      ))}
      {/* The bandage, wound on over the crack */}
      <Bandage on={mended} still={false} />
    </BreakFrame>
  );
}

/* A small cross bandage on the crack: two short sticking plasters crossed
   in an X, like a cartoon boo-boo. Each is drawn like the page's other
   doodles: an ink outline a little off true, tan tape with a row of dotted
   holes at each end, and the pale pad in the middle, where the two cross.
   The first slaps on, then the second across it; they peel off quicker
   than they went on. */

const CROSS = {
  width: "0.42em", // each plaster
  // The pair: tilt, and which goes on first (the under one)
  strips: [
    { tilt: 36, delay: 0 },
    { tilt: -34, delay: 0.09 },
  ],
  spring: { type: "spring" as const, stiffness: 560, damping: 20 },
  peel: 0.14,
  colors: { tape: "#f0c596", pad: "#f8e3c8", holes: "#c99562" },
  // One plaster on a 62 × 20 box
  outline:
    "M9 1.7 C24 0.7 40 1.5 53 1.2 C58.6 1.4 61 5.6 61 10 C61 15.1 57.6 18.8 52.6 18.6 C38 18.2 24 19.3 9.4 18.6 C4.2 18.4 1 14.8 1.2 10 C1.4 5 4.2 1.9 9 1.7 Z",
};
const HOLES = [7, 11, 15, 47, 51, 55].flatMap((x) => [6.8, 13.2].map((y) => ({ x, y })));

function Bandage({ on, still }: { on: boolean; still: boolean }) {
  return (
    <span aria-hidden className="pointer-events-none absolute top-[48%] left-[51%] z-10">
      {CROSS.strips.map((strip, i) => (
        // Centred on the crack first, so both turn about the same point: an X
        <span key={i} className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2" style={{ rotate: `${strip.tilt}deg` }}>
          {still ? (
            <Plaster />
          ) : (
            <motion.span
              className="block"
              initial={false}
              animate={on ? { opacity: 1, scale: 1, y: "0em" } : { opacity: 0, scale: 1.35, y: "-0.05em" }}
              transition={on ? { ...CROSS.spring, delay: strip.delay } : { duration: CROSS.peel, ease: "easeOut" }}
            >
              <Plaster />
            </motion.span>
          )}
        </span>
      ))}
    </span>
  );
}

function Plaster() {
  return (
    <svg
      viewBox="0 0 62 20"
      className="block overflow-visible drop-shadow-[0_0.012em_0.016em_rgba(0,0,0,0.26)]"
      style={{ width: CROSS.width }}
      fill="none"
    >
      <path d={CROSS.outline} fill={CROSS.colors.tape} stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
      <rect x={23} y={3.8} width={16} height={12.4} rx={2.6} fill={CROSS.colors.pad} stroke={CROSS.colors.holes} strokeWidth={0.8} />
      {HOLES.map(({ x, y }) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r={0.9} fill={CROSS.colors.holes} />
      ))}
      <path d="M11 4.6 C18 4.1 26 4.2 34 4" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.1} strokeLinecap="round" />
    </svg>
  );
}

/** The word's box, with its ring behind and its LED full stop after. */
function BreakFrame({
  broken,
  animated = false,
  children,
  ...handlers
}: { broken: boolean; animated?: boolean; children: ReactNode } & Partial<ReturnType<typeof useMend>["handlers"]>) {
  return (
    // A little extra room on the left, where the left half leans back.
    <span className="relative isolate ml-[0.08em] inline-block whitespace-nowrap" style={{ color: INK }} {...handlers}>
      {/* The ring, drawn behind the word once it's caught */}
      <svg
        aria-hidden
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -top-[0.2em] -left-[0.22em] -z-10 h-[calc(100%+0.4em)] w-[calc(100%+0.44em)] overflow-visible"
        fill="none"
      >
        {animated ? (
          <motion.path
            d={RING}
            stroke={SIG}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ strokeWidth: RING_STROKE }}
            initial={false}
            animate={broken ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={broken ? { delay: at(BREAK.ring), duration: BREAK.ringFor, ease: [0.65, 0, 0.35, 1] } : INSTANT}
          />
        ) : (
          <path d={RING} stroke={SIG} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ strokeWidth: RING_STROKE }} />
        )}
      </svg>

      <span className="relative inline-block">
        {/* Takes the word's space; the pieces draw over it */}
        <span className="invisible">break</span>
        {children}
      </span>

      {/* The full stop: the alert LED, lit red once the link breaks */}
      <span
        aria-hidden
        className={cn("h2-led", animated && broken && "transition-[background-color] duration-300", broken && "h2-led-alert")}
        style={{ backgroundColor: broken ? RED : UNLIT, transitionDelay: animated && broken ? `${at(BREAK.led)}s` : "0s" }}
      />
      <span className="sr-only">.</span>
    </span>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { cubicBezier, spring } from "motion";
import { createDemoClock } from "./demo-clock";

/* The "See it in ndle" pass's timeline (your-link-takeover.tsx). Clips sit
   at times in seconds and are sampled from a playhead every frame, so
   everything on screen is a pure function of that one number, the way the
   hero demo is (demo-clock.tsx, whose clock this reuses). The curves are
   Motion's: its spring, set by visual duration and bounce, and its
   cubic-bezier easing.

     tween    from → to over `duration`, on `transition`; with none, a
              spring with a little bounce that takes the clip's duration
     steps    sequential legs from `from`, each linear over its duration
     marker   an instant: only `started` means anything */

export type Curve =
  | { type: "spring"; visualDuration: number; bounce: number }
  | { type: "easing"; duration: number; ease: [number, number, number, number] };

type Values = Record<string, number>;

export type Tween = { at: number; duration: number; from: Values; to: Values; transition?: Curve };
export type Steps = { at: number; from: Values; steps: Array<{ duration: number; to: Values }> };
export type Marker = { at: number; duration: 0 };
export type Clip = Tween | Steps | Marker;

/** A timeline: its length, and clips, alone or grouped one level deep. */
export type Timeline = { duration: number } & { [key: string]: number | Clip | Record<string, Clip> };

type Sampled<C> = {
  /** The playhead is at or past the clip's start. */
  started: boolean;
  /** The playhead is inside the clip. */
  active: boolean;
  /** How far through the clip the playhead is, 0 → 1, linearly. */
  progress: number;
  /** The clip's values at the playhead. */
  current: C extends { from: infer F } ? { [K in keyof F]: number } : Record<string, never>;
};

export type SampledTimeline<T extends Timeline> = {
  [K in keyof T as K extends "duration" ? never : K]: T[K] extends { at: number }
    ? Sampled<T[K]>
    : { [G in keyof T[K]]: Sampled<T[K][G]> };
};

/** A clip with no curve springs like this, over its own duration. */
const DEFAULT_BOUNCE = 0.2;

const springs = new Map<string, ReturnType<typeof spring>>();

/** Motion's spring from 0 to 1, `elapsed` seconds in. */
function springAt(visualDuration: number, bounce: number, elapsed: number) {
  const key = `${visualDuration}|${bounce}`;
  let generator = springs.get(key);
  if (!generator) {
    generator = spring({ keyframes: [0, 1], visualDuration, bounce });
    springs.set(key, generator);
  }
  return generator.next(elapsed * 1000).value as number;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function mixValues(from: Values, to: Values, t: number) {
  const out: Values = {};
  for (const key of Object.keys(from)) out[key] = from[key] + ((to[key] ?? from[key]) - from[key]) * t;
  return out;
}

function lengthOf(clip: Clip) {
  return "steps" in clip ? clip.steps.reduce((sum, step) => sum + step.duration, 0) : clip.duration;
}

function valuesAt(clip: Clip, elapsed: number): Values {
  if ("steps" in clip) {
    let start = clip.from;
    let offset = 0;
    for (const step of clip.steps) {
      const end = { ...start, ...step.to };
      if (elapsed < offset + step.duration) return mixValues(start, end, clamp01((elapsed - offset) / step.duration));
      start = end;
      offset += step.duration;
    }
    return start;
  }
  if (!("from" in clip)) return {};
  if (elapsed <= 0) return clip.from;
  const curve = clip.transition;
  const t =
    curve?.type === "easing"
      ? cubicBezier(...curve.ease)(clamp01(elapsed / clip.duration))
      : springAt(curve?.visualDuration ?? clip.duration, curve?.bounce ?? DEFAULT_BOUNCE, elapsed);
  return mixValues(clip.from, clip.to, t);
}

function sampleClip(clip: Clip, time: number) {
  const elapsed = time - clip.at;
  const length = lengthOf(clip);
  return {
    started: elapsed >= 0,
    active: elapsed >= 0 && elapsed < length,
    progress: length > 0 ? clamp01(elapsed / length) : elapsed >= 0 ? 1 : 0,
    current: valuesAt(clip, elapsed),
  };
}

const isClip = (value: unknown): value is Clip => typeof value === "object" && value !== null && "at" in value;

/** Every clip in `timeline`, at `time` seconds. */
export function sampleTimeline<T extends Timeline>(timeline: T, time: number): SampledTimeline<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(timeline)) {
    if (typeof value === "number") continue;
    if (isClip(value)) out[key] = sampleClip(value, time);
    else out[key] = Object.fromEntries(Object.entries(value).map(([child, clip]) => [child, sampleClip(clip, time)]));
  }
  return out as SampledTimeline<T>;
}

/** A playhead over `duration` seconds, re-rendering on every frame while it
    plays: replay from the start, or jump to the end. */
export function usePlayhead(duration: number) {
  const [clock] = useState(() => createDemoClock(duration * 1000));
  const ms = useSyncExternalStore(clock.subscribe, clock.time, () => 0);
  const status = useSyncExternalStore(clock.subscribe, clock.status, () => "idle" as const);
  useEffect(() => () => clock.pause(), [clock]);
  return {
    time: ms / 1000,
    ended: status === "ended",
    replay: () => {
      clock.seek(0);
      clock.play();
    },
    end: () => clock.seek(clock.end),
  };
}

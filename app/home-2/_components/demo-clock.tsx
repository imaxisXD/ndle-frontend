"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

/* The hero demo's one clock. Everything on screen is a function of its time,
   so playing, pausing, replaying and jumping to a chapter are all just moves
   of this number. Components read it through `useDemo`, which re-renders
   them only when the value they select changes, not on every frame. */

export type DemoStatus = "idle" | "playing" | "paused" | "ended";

export type DemoClock = ReturnType<typeof createDemoClock>;

/** The most one frame may advance, so a tab coming back from the background
    picks up where it left off instead of skipping a scene. */
const MAX_FRAME_MS = 64;

export function createDemoClock(end: number) {
  let time = 0;
  let status: DemoStatus = "idle";
  let frame = 0;
  let last = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  const tick = (now: number) => {
    time = Math.min(end, time + Math.min(MAX_FRAME_MS, Math.max(0, now - last)));
    last = now;
    if (time >= end) {
      status = "ended";
      frame = 0;
    } else {
      frame = requestAnimationFrame(tick);
    }
    emit();
  };

  return {
    end,
    time: () => time,
    status: () => status,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    play() {
      if (status === "playing") return;
      if (time >= end) time = 0;
      status = "playing";
      last = performance.now();
      frame = requestAnimationFrame(tick);
      emit();
    },
    pause() {
      if (status !== "playing") return;
      cancelAnimationFrame(frame);
      status = "paused";
      emit();
    },
    seek(to: number) {
      time = Math.max(0, Math.min(end, to));
      if (status === "playing") last = performance.now();
      else status = time >= end ? "ended" : "paused";
      emit();
    },
  };
}

const DemoClockContext = createContext<DemoClock | null>(null);

export const DemoClockProvider = DemoClockContext.Provider;

export function useDemoClock() {
  const clock = useContext(DemoClockContext);
  if (!clock) throw new Error("useDemoClock must be used inside DemoClockProvider");
  return clock;
}

/** Select a value from the demo's time. Return primitives: the component
    re-renders when the selected value changes. */
export function useDemo<T>(select: (time: number) => T): T {
  const clock = useDemoClock();
  return useSyncExternalStore(
    clock.subscribe,
    () => select(clock.time()),
    () => select(0),
  );
}

export function useDemoStatus(): DemoStatus {
  const clock = useDemoClock();
  return useSyncExternalStore(clock.subscribe, clock.status, () => "idle");
}

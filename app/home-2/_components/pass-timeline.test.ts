import { describe, expect, it } from "vitest";
import { sampleTimeline, type Timeline } from "./pass-timeline";

const TIMELINE = {
  duration: 2,
  fade: {
    at: 0.5,
    duration: 0.4,
    from: { opacity: 0 },
    to: { opacity: 1 },
    transition: { type: "easing", duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  group: {
    lift: {
      at: 0,
      duration: 0.9,
      from: { progress: 0 },
      to: { progress: 1 },
      transition: { type: "spring", visualDuration: 0.9, bounce: 0.14 },
    },
    press: {
      at: 1,
      from: { scale: 1 },
      steps: [
        { duration: 0.1, to: { scale: 0.8 } },
        { duration: 0.1, to: { scale: 1 } },
      ],
    },
    open: { at: 1.5, duration: 0 },
  },
} satisfies Timeline;

describe("sampleTimeline", () => {
  it("holds a clip at its start before it begins and at its end once eased through", () => {
    expect(sampleTimeline(TIMELINE, 0.2).fade).toMatchObject({
      started: false,
      active: false,
      progress: 0,
      current: { opacity: 0 },
    });
    expect(sampleTimeline(TIMELINE, 1.2).fade).toMatchObject({
      started: true,
      active: false,
      progress: 1,
      current: { opacity: 1 },
    });
    const mid = sampleTimeline(TIMELINE, 0.7).fade;
    expect(mid.active).toBe(true);
    expect(mid.current.opacity).toBeGreaterThan(0.5); // ease-out: past halfway at the half
  });

  it("springs past its end value, then settles on it", () => {
    const peak = Math.max(...[0.9, 1, 1.1, 1.2].map((t) => sampleTimeline(TIMELINE, t).group.lift.current.progress));
    expect(peak).toBeGreaterThan(1);
    expect(sampleTimeline(TIMELINE, 2).group.lift.current.progress).toBeCloseTo(1, 2);
  });

  it("walks steps one leg at a time", () => {
    expect(sampleTimeline(TIMELINE, 1.05).group.press.current.scale).toBeCloseTo(0.9);
    expect(sampleTimeline(TIMELINE, 1.1).group.press.current.scale).toBeCloseTo(0.8);
    expect(sampleTimeline(TIMELINE, 1.5).group.press.current.scale).toBe(1);
  });

  it("marks an instant as started from its time on", () => {
    expect(sampleTimeline(TIMELINE, 1.49).group.open.started).toBe(false);
    expect(sampleTimeline(TIMELINE, 1.5).group.open.started).toBe(true);
    expect(sampleTimeline(TIMELINE, 1.5).group.open.active).toBe(false);
  });
});

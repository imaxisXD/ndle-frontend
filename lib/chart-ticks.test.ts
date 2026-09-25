import { describe, expect, it } from "vitest";
import { scaleLinear } from "@visx/scale";
import { integerTicks } from "@/components/charts/y-axis-ticks";

describe("integerTicks", () => {
  it("drops half-click ticks from small count axes", () => {
    const ticks = scaleLinear({ domain: [0, 2], range: [100, 0] }).ticks(5);
    expect(ticks).toContain(0.5);
    expect(integerTicks(ticks)).toEqual([0, 1, 2]);
  });

  it("keeps at least the whole numbers bounding a tiny domain", () => {
    expect(integerTicks([0, 0.2, 0.4, 0.6, 0.8, 1])).toEqual([0, 1]);
    expect(integerTicks([0.2, 0.4])).toEqual([0, 1]);
    expect(integerTicks([])).toEqual([]);
  });

  it("leaves ordinary whole-number ticks unchanged", () => {
    expect(integerTicks([0, 5, 10, 15, 20])).toEqual([0, 5, 10, 15, 20]);
  });
});

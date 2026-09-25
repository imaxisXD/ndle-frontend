export const Y_AXIS_DEFAULT_TICK_COUNT = 5;

/** Minimum valid `numTicks` for `scale.ticks()` — values ≤ 0 yield no ticks. */
export const Y_AXIS_MIN_TICK_COUNT = 1;

/**
 * Upper bound for the tick count hint. D3 may return more "nice" ticks above ~10;
 * keeping the hint in a modest range avoids overcrowded axes.
 */
export const Y_AXIS_MAX_TICK_COUNT = 10;

/** Clamps a user `numTicks` value to a valid d3 tick-count hint. */
export function resolveYAxisTickCount(numTicks?: number): number {
  if (numTicks == null || !Number.isFinite(numTicks)) {
    return Y_AXIS_DEFAULT_TICK_COUNT;
  }
  const rounded = Math.round(numTicks);
  if (rounded < Y_AXIS_MIN_TICK_COUNT) {
    return Y_AXIS_MIN_TICK_COUNT;
  }
  if (rounded > Y_AXIS_MAX_TICK_COUNT) {
    return Y_AXIS_MAX_TICK_COUNT;
  }
  return rounded;
}

/** Whole-number ticks for count axes: d3 picks 0, 0.5, 1… for small domains. */
export function integerTicks(ticks: number[]): number[] {
  const whole = ticks.filter(Number.isInteger);
  if (whole.length >= 2 || ticks.length === 0) return whole;
  const low = Math.floor(Math.min(...ticks));
  const high = Math.ceil(Math.max(...ticks));
  return high > low ? [low, high] : [low];
}

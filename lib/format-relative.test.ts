import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { formatRelative } from "./utils";

const NOW = Date.UTC(2026, 8, 23, 12, 0, 0);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("formatRelative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  test("describes past times", () => {
    expect(formatRelative(NOW - 5_000)).toBe("just now");
    expect(formatRelative(NOW - 3 * HOUR)).toBe("3 hours ago");
    expect(formatRelative(NOW - DAY)).toBe("1 day ago");
  });

  test("describes future times instead of saying just now", () => {
    expect(formatRelative(NOW + 14 * DAY)).toBe("in 14 days");
    expect(formatRelative(NOW + HOUR)).toBe("in 1 hour");
    expect(formatRelative(NOW + 5_000)).toBe("just now");
  });
});

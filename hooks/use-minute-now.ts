"use client";

import { useEffect, useState } from "react";

/** Returns the current timestamp and refreshes once per minute for relative labels. */
export function useMinuteNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

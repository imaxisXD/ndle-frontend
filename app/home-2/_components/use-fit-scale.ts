"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

/** Scale a stage drawn at `width` px down to its frame's width (never up).
    Shared by the hero demo and the close's comic panels. */
export function useFitScale(ref: RefObject<HTMLElement | null>, width: number) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / width));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, width]);
  return scale;
}

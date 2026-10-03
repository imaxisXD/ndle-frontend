import { type RefObject, useLayoutEffect } from "react";

/** Widest first. The frame takes the first layout whose minWidth it meets. */
export type GlideLayout = { name: string; minWidth: number };

// Timing matches the Kobra grouped table: cells glide on a long ease-out,
// newly shown cells sharpen in, and each row and cell starts a beat later.
const GLIDE = {
  duration: 460,
  easing: "cubic-bezier(0.32, 0.72, 0, 1)",
  fill: "backwards",
} as const;
const APPEAR = {
  duration: 320,
  easing: "cubic-bezier(0.23, 1, 0.32, 1)",
  fill: "backwards",
} as const;
const FIRST_DELAY = 48;
const ROW_DELAY = 18;
const PIECE_DELAY = 30;
const MAX_STAGGERED_ROWS = 12;
const ANIMATION_ID = "column-glide";

type Spot = { x: number; y: number; width: number; height: number } | null;

function layoutFor(width: number, layouts: readonly GlideLayout[]) {
  return (layouts.find((layout) => width >= layout.minWidth) ?? layouts.at(-1)!)
    .name;
}

// Rows below the fold switch without animating; nobody sees them move.
function rowsOnScreen(frame: HTMLElement) {
  const viewportBottom = window.innerHeight;
  return Array.from(
    frame.querySelectorAll<HTMLElement>("[data-glide-row]"),
  ).filter((row) => {
    const box = row.getBoundingClientRect();
    return box.bottom > 0 && box.top < viewportBottom;
  });
}

// Where each piece sits inside its row. Hidden and visually hidden pieces
// count as absent, so they sharpen in instead of gliding.
function spotsIn(rows: HTMLElement[]) {
  const spots = new Map<HTMLElement, Spot>();
  for (const row of rows) {
    const rowBox = row.getBoundingClientRect();
    for (const piece of row.querySelectorAll<HTMLElement>("[data-glide]")) {
      const box = piece.getBoundingClientRect();
      spots.set(
        piece,
        box.width <= 1 && box.height <= 1
          ? null
          : {
              x: box.left - rowBox.left,
              y: box.top - rowBox.top,
              width: box.width,
              height: box.height,
            },
      );
    }
  }
  return spots;
}

function partnerOf(
  piece: HTMLElement,
  row: HTMLElement,
  before: Map<HTMLElement, Spot>,
  after: Map<HTMLElement, Spot>,
) {
  const pair = piece.dataset.glidePair;
  if (!pair) return null;
  for (const other of row.querySelectorAll<HTMLElement>(
    `[data-glide-pair="${pair}"]`,
  )) {
    const was = before.get(other);
    if (other !== piece && was && !after.get(other)) return was;
  }
  return null;
}

function switchLayout(frame: HTMLElement, next: string) {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const rows = reduceMotion ? [] : rowsOnScreen(frame);

  // Measure before cancelling, so a glide that is still running restarts
  // from where the eye last saw it.
  const before = spotsIn(rows);
  for (const animation of frame.getAnimations({ subtree: true })) {
    if (animation.id === ANIMATION_ID) animation.cancel();
  }
  frame.dataset.layout = next;
  const after = spotsIn(rows);

  rows.forEach((row, rowIndex) => {
    const rowDelay =
      FIRST_DELAY + Math.min(rowIndex, MAX_STAGGERED_ROWS) * ROW_DELAY;
    let order = 0;

    for (const piece of row.querySelectorAll<HTMLElement>("[data-glide]")) {
      const from = before.get(piece);
      const to = after.get(piece);
      if (!to) continue;
      const delay = rowDelay + order * PIECE_DELAY;

      // A piece that takes over from one that just left (data-glide-pair,
      // e.g. the status badge and the status dot) flies in from its partner.
      const partner = !from && partnerOf(piece, row, before, after);
      if (partner) {
        const dx = partner.x + partner.width / 2 - (to.x + to.width / 2);
        const dy = partner.y + partner.height / 2 - (to.y + to.height / 2);
        piece.animate(
          [
            {
              translate: `${dx}px ${dy}px`,
              scale: 0.6,
              opacity: 0,
              filter: "blur(4px)",
            },
            { translate: "0px 0px", scale: 1, opacity: 1, filter: "blur(0px)" },
          ],
          { ...GLIDE, delay, id: ANIMATION_ID },
        );
        order++;
        continue;
      }

      if (!from) {
        piece.animate(
          [
            { opacity: 0, scale: 0.85, filter: "blur(4px)" },
            { opacity: 1, scale: 1, filter: "blur(0px)" },
          ],
          { ...APPEAR, delay, id: ANIMATION_ID },
        );
        order++;
        continue;
      }

      const dx = from.x - to.x;
      const dy = from.y - to.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

      // Animating only the offset lets the piece keep following the layout
      // while the frame is still being resized.
      piece.animate(
        [{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }],
        { ...GLIDE, delay, id: ANIMATION_ID },
      );
      order++;
    }
  });
}

/**
 * Sets `data-layout` on the frame from its own width, and glides every
 * `[data-glide]` piece inside a `[data-glide-row]` to its new spot whenever
 * the layout changes. `layouts` must be a stable reference.
 */
export function useColumnGlide(
  frameRef: RefObject<HTMLElement | null>,
  layouts: readonly GlideLayout[],
) {
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let current = layoutFor(frame.getBoundingClientRect().width, layouts);
    frame.dataset.layout = current;

    const observer = new ResizeObserver(([entry]) => {
      const width =
        entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      const next = layoutFor(width, layouts);
      if (next === current) return;
      current = next;
      switchLayout(frame, next);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frameRef, layouts]);
}

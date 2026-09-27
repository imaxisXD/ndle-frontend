"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/* The closing sign: the dashboard's black live-counter panel, blown up into a
   dot-matrix board. The words boot left to right with a flicker, the full
   stop after WATCHING is the watch light, and every few seconds it sends a
   check across the board as a ring. Unlit dots warm up under the pointer, as
   if the board were following you. One canvas; the loop only runs while the
   sign is on screen, and reduced motion gets a still, fully lit board. */

const GLYPHS: Record<string, string[]> = {
  S: [".###.", "#...#", "#....", ".###.", "....#", "#...#", ".###."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  N: ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  ".": [".", ".", ".", ".", ".", ".", "#"],
  " ": ["..", "..", "..", "..", "..", "..", ".."],
};

type Tone = "white" | "yellow";
type Line = { text: string; tone: Tone };

const WIDE: Line[] = [
  { text: "STOP GUESSING.", tone: "white" },
  { text: "START WATCHING.", tone: "yellow" },
];
const NARROW: Line[] = [
  { text: "STOP", tone: "white" },
  { text: "GUESSING.", tone: "white" },
  { text: "START", tone: "yellow" },
  { text: "WATCHING.", tone: "yellow" },
];
const WIDE_GRID = { cols: 91, rows: 21 };
const NARROW_GRID = { cols: 55, rows: 41 };
const GLYPH_ROWS = 7;
const LINE_GAP = 3;

const COLORS: Record<Tone, string> = { white: "#f2efe6", yellow: "#ffc921" };
const UNLIT: [number, number, number] = [44, 42, 38];
const WARM: [number, number, number] = [120, 96, 30];

function textWidth(text: string) {
  return [...text].reduce((w, ch) => w + GLYPHS[ch][0].length, 0) + text.length - 1;
}

type Cell = { x: number; y: number; tone: Tone | null; on: number; light: boolean };

function layout(lines: Line[], cols: number, rows: number, pitch: number) {
  const lit = new Map<number, { tone: Tone; light: boolean }>();
  const top = Math.round((rows - (lines.length * GLYPH_ROWS + (lines.length - 1) * LINE_GAP)) / 2);
  let light = -1;
  lines.forEach((line, li) => {
    let col = Math.floor((cols - textWidth(line.text)) / 2);
    const row0 = top + li * (GLYPH_ROWS + LINE_GAP);
    for (const ch of line.text) {
      const glyph = GLYPHS[ch];
      glyph.forEach((bits, r) => {
        [...bits].forEach((b, c) => {
          if (b === "#") lit.set((row0 + r) * cols + col + c, { tone: line.tone, light: false });
        });
      });
      if (ch === "." && li === lines.length - 1) light = (row0 + GLYPH_ROWS - 1) * cols + col;
      col += glyph[0].length + 1;
    }
  });
  if (light >= 0) lit.set(light, { tone: "yellow", light: true });

  const cells: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hit = lit.get(r * cols + c);
      cells.push({
        x: (c + 0.5) * pitch,
        y: (r + 0.5) * pitch,
        tone: hit?.tone ?? null,
        light: hit?.light ?? false,
        // Boot order: a left-to-right scan with a little scatter.
        on: hit ? (c / cols) * 700 + Math.random() * 260 : 0,
      });
    }
  }
  return cells;
}

export function LedSign({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wideQuery = window.matchMedia("(min-width: 640px)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let cells: Cell[] = [];
    let pitch = 10;
    let width = 0;
    let height = 0;
    let lightAt = { x: 0, y: 0 };
    let bootAt = -1;
    let frame = 0;
    let visible = false;
    const pointer = { x: 0, y: 0, active: false };

    const build = () => {
      const grid = wideQuery.matches ? WIDE_GRID : NARROW_GRID;
      const rect = wrap.getBoundingClientRect();
      width = rect.width;
      pitch = width / grid.cols;
      height = pitch * grid.rows;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cells = layout(wideQuery.matches ? WIDE : NARROW, grid.cols, grid.rows, pitch);
      const light = cells.find((c) => c.light);
      if (light) lightAt = { x: light.x, y: light.y };
    };

    const draw = (now: number) => {
      ctx.clearRect(0, 0, width, height);
      const t = bootAt < 0 ? -1 : now - bootAt;
      const dot = pitch * 0.34;
      const reach = pitch * 9;
      // A check leaves the watch light every 6 s once the board is up.
      const pingT = t > 1400 ? (t - 1400) % 6000 : -1;
      const ringR = pingT >= 0 ? pingT * 0.5 : -1;
      const ringW = pitch * 3;
      const ringFade = ringR >= 0 ? Math.max(0, 1 - ringR / (width * 0.9)) : 0;

      for (const cell of cells) {
        let boost = 0;
        if (pointer.active) {
          const d = Math.hypot(cell.x - pointer.x, cell.y - pointer.y);
          if (d < reach) boost = (1 - d / reach) ** 2;
        }
        if (ringR >= 0) {
          const dd = Math.abs(Math.hypot(cell.x - lightAt.x, cell.y - lightAt.y) - ringR);
          if (dd < ringW) boost = Math.max(boost, (1 - dd / ringW) * 0.7 * ringFade);
        }

        // Lit cells blink once on their way up, then stay on.
        const since = t - cell.on;
        const isOn = cell.tone !== null && (still || (t >= 0 && since >= 0 && !(since > 70 && since < 150)));

        if (isOn && cell.tone) {
          const color = COLORS[cell.tone];
          let glow = 0.14 + boost * 0.12;
          let size = dot * (1 + boost * 0.12);
          if (cell.light) {
            const pulse = still ? 0 : (Math.sin(now / 420) + 1) / 2;
            glow = 0.22 + pulse * 0.2 + (pingT >= 0 && pingT < 240 ? 0.4 : 0);
            size = dot * (1.15 + pulse * 0.15);
          }
          ctx.globalAlpha = glow;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, size * 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const k = boost * 0.9;
          const r = Math.round(UNLIT[0] + (WARM[0] - UNLIT[0]) * k);
          const g = Math.round(UNLIT[1] + (WARM[1] - UNLIT[1]) * k);
          const b = Math.round(UNLIT[2] + (WARM[2] - UNLIT[2]) * k);
          ctx.globalAlpha = 1;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.beginPath();
          ctx.arc(cell.x, cell.y, dot * (0.9 + boost * 0.25), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      draw(now);
      frame = visible ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (still) {
        draw(performance.now());
        return;
      }
      if (bootAt < 0) bootAt = performance.now() + 150;
      if (!frame) frame = requestAnimationFrame(loop);
    };

    build();
    draw(performance.now());

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      },
      { threshold: 0.35 },
    );
    io.observe(wrap);

    const ro = new ResizeObserver(() => {
      build();
      draw(performance.now());
    });
    ro.observe(wrap);
    const onQuery = () => {
      build();
      draw(performance.now());
    };
    wideQuery.addEventListener("change", onQuery);

    const onMove = (e: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
      if (still) draw(performance.now());
    };
    const onLeave = () => {
      pointer.active = false;
      if (still) draw(performance.now());
    };
    if (finePointer) {
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerleave", onLeave);
    }

    return () => {
      io.disconnect();
      ro.disconnect();
      wideQuery.removeEventListener("change", onQuery);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={wrapRef} aria-hidden className={cn("relative aspect-[55/41] w-full sm:aspect-[91/21]", className)}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  );
}

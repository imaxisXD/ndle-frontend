import { describe, expect, test } from "vitest";
import { washesOut } from "./favicon-backdrop";

const SIZE = 32;
type Rgba = [number, number, number, number];

const CLEAR: Rgba = [0, 0, 0, 0];
const WHITE: Rgba = [255, 255, 255, 255];
const BLACK: Rgba = [0, 0, 0, 255];

/** A square favicon whose pixel at (x, y) is paint(x, y). */
function favicon(paint: (x: number, y: number) => Rgba) {
  const pixels: number[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) pixels.push(...paint(x, y));
  }
  return pixels;
}

const inCenter = (x: number, y: number, half: number) =>
  Math.abs(x + 0.5 - SIZE / 2) < half && Math.abs(y + 0.5 - SIZE / 2) < half;

describe("washesOut", () => {
  test("moves light favicons to the dark container", () => {
    const whiteLogo = favicon((x, y) => (inCenter(x, y, 10) ? WHITE : CLEAR));
    const whiteSquareWithMark = favicon((x, y) => (inCenter(x, y, 4) ? BLACK : WHITE));
    const blueLineArt = favicon((x) => (x % 8 === 0 ? [0, 135, 203, 248] : CLEAR));
    expect(washesOut(whiteLogo, SIZE)).toBe(true);
    expect(washesOut(whiteSquareWithMark, SIZE)).toBe(true);
    expect(washesOut(blueLineArt, SIZE)).toBe(true);
  });

  test("keeps dark and colorful favicons on the light container", () => {
    const blackBadge = favicon((x, y) => (inCenter(x, y, 5) ? WHITE : BLACK));
    const purple = favicon(() => [120, 60, 220, 255]);
    expect(washesOut(blackBadge, SIZE)).toBe(false);
    expect(washesOut(purple, SIZE)).toBe(false);
  });

  test("keeps a small dark mark on a clear background on the light container", () => {
    const smallMark = favicon((x, y) => (inCenter(x, y, 4) ? BLACK : CLEAR));
    expect(washesOut(smallMark, SIZE)).toBe(false);
  });

  test("keeps an empty favicon on the light container", () => {
    expect(washesOut(favicon(() => CLEAR), SIZE)).toBe(false);
  });
});

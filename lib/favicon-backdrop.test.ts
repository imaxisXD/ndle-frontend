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
  test("puts light marks on a clear background on the dark disc", () => {
    const whiteLogo = favicon((x, y) => (inCenter(x, y, 8) ? WHITE : CLEAR));
    const blueLineArt = favicon((x) => (x % 8 === 0 ? [0, 135, 203, 248] : CLEAR));
    expect(washesOut(whiteLogo, SIZE)).toBe(true);
    expect(washesOut(blueLineArt, SIZE)).toBe(true);
  });

  test("keeps favicons with their own background on the light container", () => {
    const whiteSquareWithMark = favicon((x, y) => (inCenter(x, y, 4) ? BLACK : WHITE));
    const blackBadge = favicon((x, y) => (inCenter(x, y, 5) ? WHITE : BLACK));
    const purple = favicon(() => [120, 60, 220, 255]);
    expect(washesOut(whiteSquareWithMark, SIZE)).toBe(false);
    expect(washesOut(blackBadge, SIZE)).toBe(false);
    expect(washesOut(purple, SIZE)).toBe(false);
  });

  test("keeps dark marks on a clear background on the light container", () => {
    const smallMark = favicon((x, y) => (inCenter(x, y, 4) ? BLACK : CLEAR));
    expect(washesOut(smallMark, SIZE)).toBe(false);
  });

  test("keeps an empty favicon on the light container", () => {
    expect(washesOut(favicon(() => CLEAR), SIZE)).toBe(false);
  });
});

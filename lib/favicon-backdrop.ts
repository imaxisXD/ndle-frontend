/* Picks the favicon container's color. Most favicons show up on the light
   container, but a light one (a white logo, a white square behind a small
   mark, or thin light line art) washes out into it, so it sits on a dark
   container instead. */

/** Favicons are read at the size the favicon service returns them. */
const SAMPLE_SIZE = 32;
/** The light container's color as an sRGB channel value (bg-muted, bg-zinc-100). */
const LIGHT_BACKDROP = 240;
/** Lightness, from 0 to 1, above which a pixel blends into the light container. */
const BLENDS_IN = 0.8;

function toLinear(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Perceived lightness, from 0 (black) to 1 (white). */
function lightness(r: number, g: number, b: number) {
  return Math.cbrt(0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b));
}

/**
 * Whether a square favicon's RGBA pixels wash out on the light container. They
 * do when more than half of the round crop blends into the container, as long
 * as the favicon's own colors are light enough to show up on a dark one. (A
 * small black mark on a clear background blends in too, but it'd vanish on dark.)
 */
export function washesOut(pixels: ArrayLike<number>, size: number): boolean {
  const radius = size / 2;
  let area = 0;
  let blended = 0;
  let ink = 0;
  let inkLightness = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // The favicon is cropped to a circle, so its corners don't count.
      if (Math.hypot(x + 0.5 - radius, y + 0.5 - radius) > radius) continue;
      const i = (y * size + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const alpha = pixels[i + 3] / 255;
      const over = (channel: number) => alpha * channel + (1 - alpha) * LIGHT_BACKDROP;
      area += 1;
      if (lightness(over(r), over(g), over(b)) > BLENDS_IN) blended += 1;
      ink += alpha;
      inkLightness += alpha * lightness(r, g, b);
    }
  }
  return blended / area > 0.5 && ink > 0 && inkLightness / ink > 0.5;
}

let canvas: HTMLCanvasElement | undefined;

/** Whether a loaded favicon should sit on the dark container. The image has to
    be same-origin or loaded with CORS to be read; if it can't be, it keeps the
    light container. */
export function needsDarkBackdrop(image: HTMLImageElement): boolean {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
  }
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  try {
    context.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    context.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    const { data } = context.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
    return washesOut(data, SAMPLE_SIZE);
  } catch {
    return false;
  }
}

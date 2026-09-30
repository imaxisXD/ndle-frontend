/* Picks what a favicon sits on. Most favicons show up on the light container,
   but light marks on a clear background (a white logo, or thin light line art)
   wash out into it, so they sit on a dark disc instead, the way the black
   favicons around them look. */

/** Favicons are read at the size the favicon service returns them. */
const SAMPLE_SIZE = 32;

function toLinear(channel: number) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Perceived lightness, from 0 (black) to 1 (white). */
function lightness(r: number, g: number, b: number) {
  return Math.cbrt(0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b));
}

/**
 * Whether a square favicon's RGBA pixels are light marks on a clear background.
 * More than half of the round crop has to be clear, and what's drawn has to be
 * light enough to show up on a dark disc. Favicons with their own background,
 * even a white one, already show their shape, so they don't count.
 */
export function washesOut(pixels: ArrayLike<number>, size: number): boolean {
  const radius = size / 2;
  let area = 0;
  let ink = 0;
  let inkLightness = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // The favicon is cropped to a circle, so its corners don't count.
      if (Math.hypot(x + 0.5 - radius, y + 0.5 - radius) > radius) continue;
      const i = (y * size + x) * 4;
      const alpha = pixels[i + 3] / 255;
      area += 1;
      ink += alpha;
      inkLightness += alpha * lightness(pixels[i], pixels[i + 1], pixels[i + 2]);
    }
  }
  return ink > 0 && ink / area < 0.5 && inkLightness / ink > 0.5;
}

let canvas: HTMLCanvasElement | undefined;

/** Whether a loaded favicon should sit on the dark disc. The image has to be
    same-origin or loaded with CORS to be read; if it can't be, it doesn't. */
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

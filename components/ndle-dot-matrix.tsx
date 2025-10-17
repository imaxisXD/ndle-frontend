import { digits, Matrix } from "./ui/matrix";

type Frame = number[][];

const GLYPH_HEIGHT = 7;
const GLYPH_WIDTH = 5;

// 5x7 lowercase glyphs for: n, d, l, e
const glyphs: Record<string, Frame> = {
  n: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [1, 0, 1, 1, 0],
    [1, 1, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  d: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [0, 1, 1, 1, 0],
  ],
  l: [
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 0, 0],
  ],
  e: [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
  ],
};

function trimGlyphWhitespace(glyph: Frame): Frame {
  const rows = glyph.length;
  const cols = glyph[0]?.length ?? 0;
  let left = 0;
  let right = cols - 1;

  // find first non-empty column from the left
  for (let c = 0; c < cols; c++) {
    let hasPixel = false;
    for (let r = 0; r < rows; r++) {
      if (glyph[r][c] > 0) {
        hasPixel = true;
        break;
      }
    }
    if (hasPixel) {
      left = c;
      break;
    }
  }

  // find first non-empty column from the right
  for (let c = cols - 1; c >= 0; c--) {
    let hasPixel = false;
    for (let r = 0; r < rows; r++) {
      if (glyph[r][c] > 0) {
        hasPixel = true;
        break;
      }
    }
    if (hasPixel) {
      right = c;
      break;
    }
  }

  // If glyph is completely empty, return as-is
  if (right < left) return glyph;

  const width = right - left + 1;
  const trimmed: Frame = Array.from({ length: rows }, () =>
    Array(width).fill(0),
  );
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < width; c++) {
      trimmed[r][c] = glyph[r][left + c];
    }
  }
  return trimmed;
}

function composeTextFrame(text: string, letterSpacingCols: number = 0): Frame {
  const glyphsToRender: Frame[] = [];
  for (const ch of text) {
    const glyph = glyphs[ch];
    if (glyph) {
      glyphsToRender.push(trimGlyphWhitespace(glyph));
    }
  }

  const baseWidth =
    glyphsToRender.reduce((sum, g) => sum + (g[0]?.length ?? GLYPH_WIDTH), 0) +
    Math.max(0, glyphsToRender.length - 1) * letterSpacingCols;

  const frame: Frame = Array.from({ length: GLYPH_HEIGHT }, () =>
    Array(baseWidth).fill(0),
  );

  let cursor = 0;
  glyphsToRender.forEach((g, idx) => {
    for (let r = 0; r < GLYPH_HEIGHT; r++) {
      for (let c = 0; c < g[0].length; c++) {
        frame[r][cursor + c] = g[r][c];
      }
    }
    cursor += g[0].length;
    if (idx < glyphsToRender.length - 1) cursor += letterSpacingCols;
  });

  return frame;
}

function scaleAndCenterFrame(
  base: Frame,
  targetRows: number,
  targetCols: number,
): Frame {
  const baseRows = base.length;
  const baseCols = base[0]?.length ?? 0;
  if (baseRows === 0 || baseCols === 0) {
    return Array.from({ length: targetRows }, () => Array(targetCols).fill(0));
  }

  // Preserve aspect ratio based on height; center horizontally
  const targetContentWidth = Math.max(
    1,
    Math.min(targetCols, Math.round((targetRows / baseRows) * baseCols)),
  );
  const leftMargin = Math.floor((targetCols - targetContentWidth) / 2);

  const result: Frame = Array.from({ length: targetRows }, () =>
    Array(targetCols).fill(0),
  );

  for (let r = 0; r < targetRows; r++) {
    const baseR = Math.min(
      baseRows - 1,
      Math.floor((r * baseRows) / targetRows),
    );
    for (let c = 0; c < targetContentWidth; c++) {
      const baseC = Math.min(
        baseCols - 1,
        Math.floor((c * baseCols) / targetContentWidth),
      );
      const targetC = leftMargin + c;
      result[r][targetC] = base[baseR][baseC];
    }
  }

  return result;
}

export function NdleDotMatrix({
  rows = 7,
  cols = 21,
  letterSpacing = 1,
  palette,
}: {
  rows?: number;
  cols?: number;
  letterSpacing?: number;
  palette?: { on: string; off: string };
}) {
  const base = composeTextFrame("ndle", letterSpacing);
  const pattern = scaleAndCenterFrame(base, rows, cols);
  return (
    <Matrix
      ariaLabel="Ndle"
      rows={rows}
      cols={cols}
      pattern={pattern}
      size={4.5}
      gap={1.5}
    />
  );
}

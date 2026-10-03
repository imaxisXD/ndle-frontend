export type QrEcc = "L" | "M" | "Q" | "H";
export type QrLogoMode = "brand" | "custom" | "none";

export type QrStyle = {
  size: number;
  fg: string;
  bg: string;
  margin: number;
  includeMargin: boolean;
  ecc: QrEcc;
  logoMode: QrLogoMode;
  logoScale: number;
  customLogoUrl?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isQrEcc(value: unknown): value is QrEcc {
  return value === "L" || value === "M" || value === "Q" || value === "H";
}

function isQrLogoMode(value: unknown): value is QrLogoMode {
  return value === "brand" || value === "custom" || value === "none";
}

export function clampQrSize(value: number | undefined, fallback = 200) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), 64, 2048);
}

export function clampQrMargin(value: number | undefined, fallback = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), 0, 8);
}

export function clampQrLogoScale(value: number | undefined, fallback = 0.18) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(value, 0.08, 0.35);
}

export function normalizeQrStyle(style?: Partial<QrStyle> | null): QrStyle {
  const margin = clampQrMargin(style?.margin, 2);
  return {
    size: clampQrSize(style?.size, 200),
    fg: style?.fg?.trim() || "#000000",
    bg: style?.bg?.trim() || "#ffffff",
    margin,
    includeMargin:
      typeof style?.includeMargin === "boolean"
        ? style.includeMargin
        : margin > 0,
    ecc: isQrEcc(style?.ecc) ? style.ecc : "H",
    logoMode: isQrLogoMode(style?.logoMode) ? style.logoMode : "brand",
    logoScale: clampQrLogoScale(style?.logoScale, 0.18),
    customLogoUrl: style?.customLogoUrl?.trim() || undefined,
  };
}

export function getQrMarginSize(style?: Partial<QrStyle> | null) {
  const normalized = normalizeQrStyle(style);
  return normalized.includeMargin ? normalized.margin : 0;
}

// The favicon's dot-matrix "n" on a 5×6 grid, as [column, row]: the left
// stem, three dots stepping down across the shoulder, and the right stem.
const BADGE_DOTS: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 0],
  [2, 1],
  [3, 2],
  [4, 0],
  [4, 1],
  [4, 2],
  [4, 3],
  [4, 4],
  [4, 5],
];

/**
 * ndle's mark for the middle of a QR code: the favicon, black dots on Signal
 * Yellow, in a rounded square like the code's corner finders. A thin outline
 * in the code's colour keeps its edge on any background, yellow included.
 */
export function getBrandBadgeSvg(fg: string) {
  const outline = fg.trim().replace(/"/g, "") || "#000000";
  // 12 between dots, 10 across each (the favicon's 5:6), centred in 100.
  const dots = BADGE_DOTS.map(
    ([column, row]) =>
      `<circle cx="${26 + column * 12}" cy="${20 + row * 12}" r="5" fill="#000000"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="1" y="1" width="98" height="98" rx="24" fill="#ffc700" stroke="${outline}" stroke-width="2"/>${dots}</svg>`;
}

export function getBrandBadgeDataUrl(fg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(getBrandBadgeSvg(fg))}`;
}

export function getQrOverlaySrc(style?: Partial<QrStyle> | null) {
  const normalized = normalizeQrStyle(style);
  if (normalized.logoMode === "none") {
    return undefined;
  }
  if (normalized.logoMode === "custom" && normalized.customLogoUrl) {
    return normalized.customLogoUrl;
  }
  return getBrandBadgeDataUrl(normalized.fg);
}

export function getQrOverlaySize(style?: Partial<QrStyle> | null) {
  const normalized = normalizeQrStyle(style);
  return Math.max(8, Math.round(normalized.size * normalized.logoScale));
}

/** The logo to draw in the middle of a code with this style, if any.
    Uploaded logos sit on a white square so they read on any colour. */
export function getQrLogo(style?: Partial<QrStyle> | null) {
  const normalized = normalizeQrStyle(style);
  const href = getQrOverlaySrc(normalized);
  if (!href) return undefined;
  return {
    href,
    size: getQrOverlaySize(normalized),
    backdrop: normalized.logoMode === "custom" && !!normalized.customLogoUrl,
  };
}

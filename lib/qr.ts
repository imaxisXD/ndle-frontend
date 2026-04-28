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
  if (!Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), 64, 2048);
}

export function clampQrMargin(value: number | undefined, fallback = 2) {
  if (!Number.isFinite(value)) return fallback;
  return clamp(Math.round(value), 0, 8);
}

export function clampQrLogoScale(value: number | undefined, fallback = 0.18) {
  if (!Number.isFinite(value)) return fallback;
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

export function getBrandBadgeSvg(fg: string) {
  const safeFg = fg.trim() || "#000000";
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="36" fill="white" />
      <path
        d="M38 66V37M38 49C38 41.268 44.268 35 52 35C59.732 35 66 41.268 66 49V66"
        stroke="${safeFg}"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="12"
      />
    </svg>
  `.trim();
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

import { encode, QrCodeDataType } from "uqr";
import type { QrEcc } from "./qr";

/**
 * ndle's QR look, shared by the in-app <QrCode> and the /api/qr downloads so
 * what people see is exactly what they download. uqr only encodes; the
 * drawing is ours: round dots for data, rounded squares for the three
 * corner finders, and an optional logo with the dots cleared behind it.
 */

/** Dot radius in modules. 0.4 leaves a gap between dots but keeps enough ink
    for phone cameras. */
export const QR_DOT_RADIUS = 0.4;

export type QrLogo = {
  href: string;
  /** Width and height in px, at the code's `size`. */
  size: number;
  /** Put a white rounded square behind the logo (for uploaded logos). */
  backdrop?: boolean;
};

export type QrDrawOptions = {
  /** Width and height in px. */
  size: number;
  fg: string;
  /** A colour, or "transparent". */
  bg: string;
  ecc: QrEcc;
  /** Quiet zone around the code, in modules. */
  margin: number;
  logo?: QrLogo;
};

export type QrCell = { x: number; y: number; on: boolean };

export type QrLayout = {
  /** Side of the drawing in modules, margin included (the viewBox). */
  modules: number;
  /** Top-left module of each 7×7 corner finder. */
  finders: Array<{ x: number; y: number }>;
  /** Every module outside the finders, on or off. Off cells are kept so the
      animated code has a slot to grow a dot into. */
  cells: QrCell[];
  logo?: QrLogo & { x: number; y: number; side: number };
};

export function layoutQr(
  value: string,
  { size, ecc, margin, logo }: Omit<QrDrawOptions, "fg" | "bg">,
): QrLayout {
  const qr = encode(value, { ecc, border: 0 });
  const modules = qr.size + margin * 2;

  // The logo's square in modules, plus half a module of clear space so no
  // dot is cut by its edge.
  let placedLogo: QrLayout["logo"];
  let clear = (_x: number, _y: number) => false;
  if (logo) {
    const side = (logo.size / size) * modules;
    const start = (modules - side) / 2;
    placedLogo = { ...logo, x: start, y: start, side };
    const low = start - 0.5;
    const high = start + side + 0.5;
    clear = (x, y) => x + 1 > low && x < high && y + 1 > low && y < high;
  }

  const cells: QrCell[] = [];
  for (let row = 0; row < qr.size; row++) {
    for (let col = 0; col < qr.size; col++) {
      if (qr.types[row][col] === QrCodeDataType.Position) continue;
      const x = col + margin;
      const y = row + margin;
      cells.push({ x, y, on: qr.data[row][col] && !clear(x, y) });
    }
  }

  const far = qr.size - 7 + margin;
  return {
    modules,
    finders: [
      { x: margin, y: margin },
      { x: far, y: margin },
      { x: margin, y: far },
    ],
    cells,
    logo: placedLogo,
  };
}

/** The ring and the solid centre of a corner finder, in modules. */
export function finderShapes(x: number, y: number) {
  return {
    ring: { x: x + 0.5, y: y + 0.5, side: 6, radius: 1.75 },
    eye: { x: x + 2, y: y + 2, side: 3, radius: 1 },
  };
}

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** The code as a standalone SVG file, for downloads and the PNG renderer. */
export function qrCodeSvg(value: string, options: QrDrawOptions) {
  const { size, fg, bg } = options;
  const layout = layoutQr(value, options);
  const { modules } = layout;
  const ink = escapeAttribute(fg);
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${modules} ${modules}">`,
  ];

  if (bg !== "transparent") {
    parts.push(
      `<rect width="${modules}" height="${modules}" fill="${escapeAttribute(bg)}"/>`,
    );
  }

  for (const finder of layout.finders) {
    const { ring, eye } = finderShapes(finder.x, finder.y);
    parts.push(
      `<rect x="${ring.x}" y="${ring.y}" width="${ring.side}" height="${ring.side}" rx="${ring.radius}" fill="none" stroke="${ink}" stroke-width="1"/>`,
      `<rect x="${eye.x}" y="${eye.y}" width="${eye.side}" height="${eye.side}" rx="${eye.radius}" fill="${ink}"/>`,
    );
  }

  // All dots as one path of circles keeps the file small.
  const r = QR_DOT_RADIUS;
  const dots = layout.cells
    .filter((cell) => cell.on)
    .map(
      ({ x, y }) =>
        `M${x + 0.5 - r} ${y + 0.5}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`,
    )
    .join("");
  parts.push(`<path d="${dots}" fill="${ink}"/>`);

  if (layout.logo) {
    const { x, y, side, href, backdrop } = layout.logo;
    if (backdrop) {
      parts.push(
        `<rect x="${x}" y="${y}" width="${side}" height="${side}" rx="${side / 5}" fill="#ffffff"/>`,
      );
    }
    parts.push(
      `<image href="${escapeAttribute(href)}" x="${x}" y="${y}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid slice"/>`,
    );
  }

  parts.push("</svg>");
  return parts.join("");
}

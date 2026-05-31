import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import sharp from "sharp";
import { getCacheHeadersPreset } from "@/lib/cacheHeaders";
import { makeShortLink } from "@/lib/config";
import { getBrandBadgeDataUrl } from "@/lib/qr";
import { lookup } from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";

type EccLevel = "L" | "M" | "Q" | "H";
type LogoMode = "brand" | "custom" | "none";
const MAX_LOGO_BYTES = 1_000_000;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function parseHexColor(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const v = value.trim();
  if (v.toLowerCase() === "transparent") return "transparent";
  const hex = v.startsWith("#") ? v.slice(1) : v;
  if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex.toLowerCase()}`;
  return fallback;
}

function parseNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:169.254.") ||
    normalized.startsWith("::ffff:172.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("2001:db8:")
  );
}

async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Unsupported logo protocol");
  }
  if (url.username || url.password) {
    throw new Error("Logo URL must not include credentials");
  }
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Local logo hosts are not allowed");
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("Logo host did not resolve");
  }
  for (const record of records) {
    const family = net.isIP(record.address);
    if (family === 4 && isPrivateIpv4(record.address)) {
      throw new Error("Logo host resolves to a private address");
    }
    if (family === 6 && isPrivateIpv6(record.address)) {
      throw new Error("Logo host resolves to a private address");
    }
  }
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    let currentUrl = new URL(url);
    let res: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
      await assertPublicHttpUrl(currentUrl);
      res = await fetch(currentUrl.toString(), {
        // 4s timeout to protect server
        signal: AbortSignal.timeout(4000),
        headers: { "User-Agent": "ndle-qr/1.0" },
        cache: "no-store",
        redirect: "manual",
      });
      if (![301, 302, 303, 307, 308].includes(res.status)) break;
      const location = res.headers.get("location");
      if (!location) return null;
      currentUrl = new URL(location, currentUrl);
    }
    if (!res) return null;
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    const isPng = contentType.startsWith("image/png");
    const isJpeg = contentType.startsWith("image/jpeg");
    if (!isPng && !isJpeg) return null;
    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > MAX_LOGO_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_LOGO_BYTES) return null;
    const base64 = buf.toString("base64");
    return `data:${isPng ? "image/png" : "image/jpeg"};base64,${base64}`;
  } catch {
    return null;
  }
}

function ensureSizeAttrs(svg: string, size: number): string {
  // Ensure xmlns and normalize width/height on root <svg>
  return svg.replace(/<svg\b([^>]*)>/, (_m, attrs) => {
    // Strip any existing conflicting attributes
    let cleaned = attrs.replace(
      /\s*(xmlns|width|height|viewBox)\s*=\s*"[^"]*"/g,
      "",
    );
    // Ensure xmlns exists
    if (!/xmlns\s*=/.test(attrs)) {
      cleaned += ` xmlns="http://www.w3.org/2000/svg"`;
    }
    // Add normalized size and viewBox for consistent rendering
    cleaned += ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"`;
    return `<svg${cleaned}>`;
  });
}

function maybeMakeBackgroundTransparent(svg: string, bg: string): string {
  if (bg !== "transparent") return svg;
  // Try to remove/neutralize the background rect if present
  // Replace a top-level rect fill with none/transparent
  let out = svg.replace(/(<rect\b[^>]*\bfill=")[^"]+("[^>]*\/>)/i, `$1none$2`);
  // Also replace any light color fills with none for background paths
  out = out.replace(/fill="transparent"/gi, `fill="none"`);
  return out;
}

function addImageOverlay(
  svg: string,
  size: number,
  dataUrl: string,
  scale: number,
  addBackdrop = false,
) {
  const diameter = clamp(Math.round(size * scale), 8, Math.round(size * 0.5));
  const x = size / 2 - diameter / 2;
  const y = size / 2 - diameter / 2;
  const overlay = [
    `<g pointer-events="none" aria-label="custom logo">`,
    addBackdrop
      ? `<rect x="${x}" y="${y}" width="${diameter}" height="${diameter}" rx="${Math.round(
          diameter / 5,
        )}" fill="white" opacity="0.95"/>`
      : "",
    `<image href="${dataUrl}" x="${x}" y="${y}" width="${diameter}" height="${diameter}" preserveAspectRatio="xMidYMid slice" crossOrigin="anonymous"/>`,
    `</g>`,
  ].join("");
  return svg.replace(/<\/svg>\s*$/i, `${overlay}</svg>`);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const requestUrl = new URL(req.url);
    const debug = requestUrl.searchParams.get("debug") === "1";
    const log = (...args: unknown[]) => {
      if (debug || process.env.NODE_ENV !== "production") {
        console.log("[qr-api]", ...args);
      }
    };
    const logError = (...args: unknown[]) => {
      console.error("[qr-api]", ...args);
    };

    const { slug: rawSlug } = await ctx.params;
    const slug = (rawSlug || "").trim();
    if (!slug) {
      logError("missing slug");
      return NextResponse.json(
        { error: "Missing slug" },
        { status: 400, headers: getCacheHeadersPreset("ERROR") },
      );
    }

    const format = (requestUrl.searchParams.get("format") || "png")
      .toLowerCase()
      .trim();
    const wantSvg = format === "svg";
    const wantPng = format === "png";
    if (!wantSvg && !wantPng) {
      log("unsupported format", format);
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 406, headers: getCacheHeadersPreset("ERROR") },
      );
    }

    const size = clamp(
      parseNumber(requestUrl.searchParams.get("size"), 512),
      64,
      2048,
    );
    const margin = clamp(
      parseNumber(requestUrl.searchParams.get("margin"), 2),
      0,
      8,
    );
    const ecc: EccLevel =
      ((requestUrl.searchParams.get("ecc") || "H").toUpperCase() as EccLevel) ||
      "H";
    const fg = parseHexColor(requestUrl.searchParams.get("fg"), "#000000");
    const bgRaw = requestUrl.searchParams.get("bg");
    const bg =
      bgRaw && bgRaw.toLowerCase() === "transparent"
        ? "transparent"
        : parseHexColor(bgRaw, "#ffffff");

    const logoMode: LogoMode =
      ((requestUrl.searchParams.get("logoMode") || "brand") as LogoMode) ||
      "brand";
    const logoScale = clamp(
      parseNumber(requestUrl.searchParams.get("logoScale"), 0.18),
      0.08,
      0.35,
    );
    const logoUrl = requestUrl.searchParams.get("logoUrl") || "";

    const target = `https://${makeShortLink(slug)}`;
    log("params", { slug, size, margin, ecc, fg, bg, logoMode, logoScale });
    log("target", target);

    // Generate base QR as SVG
    let svg: string;
    try {
      svg = await QRCode.toString(target, {
        type: "svg",
        errorCorrectionLevel: ecc,
        margin,
        color: {
          dark: fg,
          light: bg,
        },
      });
    } catch (e) {
      logError("qrcode generation failed", e);
      return NextResponse.json(
        { error: "QR generation failed" },
        { status: 500, headers: getCacheHeadersPreset("ERROR") },
      );
    }

    // Normalize root size and background transparency
    svg = ensureSizeAttrs(svg, size);
    svg = maybeMakeBackgroundTransparent(svg, bg);

    // Add overlays
    if (logoMode === "brand") {
      log("overlay", "brand");
      svg = addImageOverlay(svg, size, getBrandBadgeDataUrl(fg), logoScale);
    } else if (logoMode === "custom" && logoUrl) {
      log("overlay", "custom", logoUrl);
      const dataUrl = await fetchImageAsDataUrl(logoUrl);
      if (dataUrl) {
        svg = addImageOverlay(svg, size, dataUrl, logoScale, true);
      } else {
        // Fallback to brand overlay if custom logo fails
        log("custom logo fetch failed, fallback brand");
        svg = addImageOverlay(svg, size, getBrandBadgeDataUrl(fg), logoScale);
      }
    }

    log("svg-length", svg.length);
    if (wantSvg) {
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          ...getCacheHeadersPreset("STATIC"),
        },
      });
    }

    // PNG: rasterize SVG using sharp
    try {
      const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
      const arrayBuffer = pngBuffer.buffer.slice(
        pngBuffer.byteOffset,
        pngBuffer.byteOffset + pngBuffer.byteLength,
      ) as ArrayBuffer;
      const pngBlob = new Blob([arrayBuffer], { type: "image/png" });
      return new NextResponse(pngBlob, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          ...getCacheHeadersPreset("STATIC"),
        },
      });
    } catch (e) {
      logError("png conversion failed", e);
      return NextResponse.json(
        { error: "PNG conversion failed" },
        { status: 500, headers: getCacheHeadersPreset("ERROR") },
      );
    }
  } catch (err) {
    console.error("[qr-api] unhandled error", err);
    return NextResponse.json(
      { error: "Failed to generate QR" },
      { status: 500, headers: getCacheHeadersPreset("ERROR") },
    );
  }
}

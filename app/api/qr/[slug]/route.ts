import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Resvg } from "@cf-wasm/resvg";
import { getShortDomain, makeShortLinkWithDomain } from "@/lib/config";
import { getBrandBadgeDataUrl } from "@/lib/qr";
import { type QrLogo, qrCodeSvg } from "@/lib/qr-code";
import { getQrRateLimit } from "@/lib/rateLimit";
import {
  getSignedInAnalyticsViewer,
  queryConvexAsUser,
} from "@/lib/server-analytics-plan";
import {
  canonicalHostname,
  hasBlockedLocalSuffix,
  isLocalhost,
  isPrivateIP,
  withoutIPv6Brackets,
} from "@/lib/url-safety";
import { lookup } from "node:dns/promises";
import net from "node:net";

export const runtime = "nodejs";

type EccLevel = "L" | "M" | "Q" | "H";
type LogoMode = "brand" | "custom" | "none";

const MAX_LOGO_BYTES = 1_000_000;
const VALID_SLUG_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/;
const VALID_DOMAIN_PATTERN =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
const PRIVATE_CACHE_HEADERS = { "Cache-Control": "private, max-age=3600" } as const;

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

function parseLogoMode(value: string | null): LogoMode {
  if (value === "custom" || value === "none" || value === "brand") {
    return value;
  }
  return "brand";
}

async function assertPublicHttpUrl(url: URL): Promise<void> {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Unsupported logo protocol");
  }
  if (url.username || url.password) {
    throw new Error("Logo URL must not include credentials");
  }
  const hostname = withoutIPv6Brackets(canonicalHostname(url.hostname));
  if (
    !hostname ||
    isLocalhost(hostname) ||
    hasBlockedLocalSuffix(hostname) ||
    isPrivateIP(hostname)
  ) {
    throw new Error("Local or private logo hosts are not allowed");
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error("Logo host did not resolve");
  }
  for (const record of records) {
    const family = net.isIP(record.address);
    if ((family === 4 || family === 6) && isPrivateIP(record.address)) {
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
    if (!res || !res.ok) return null;
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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to download QR codes" },
        { status: 401, headers: NO_STORE_HEADERS },
      );
    }

    const rate = await getQrRateLimit().limit(`qr:${userId}`);
    if (!rate.success) {
      return NextResponse.json(
        { error: "Too many QR requests. Try again shortly." },
        { status: 429, headers: NO_STORE_HEADERS },
      );
    }

    const requestUrl = new URL(req.url);
    const { slug: rawSlug } = await ctx.params;
    const slug = (rawSlug || "").trim();
    if (!slug || !VALID_SLUG_PATTERN.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }

    const format = (requestUrl.searchParams.get("format") || "png")
      .toLowerCase()
      .trim();
    const wantSvg = format === "svg";
    const wantPng = format === "png";
    if (!wantSvg && !wantPng) {
      return NextResponse.json(
        { error: "Unsupported format" },
        { status: 406, headers: NO_STORE_HEADERS },
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
    const eccParam = (requestUrl.searchParams.get("ecc") || "H").toUpperCase();
    const ecc: EccLevel = ["L", "M", "Q", "H"].includes(eccParam)
      ? (eccParam as EccLevel)
      : "H";
    const fg = parseHexColor(requestUrl.searchParams.get("fg"), "#000000");
    const bgRaw = requestUrl.searchParams.get("bg");
    const bg =
      bgRaw && bgRaw.toLowerCase() === "transparent"
        ? "transparent"
        : parseHexColor(bgRaw, "#ffffff");

    const logoMode = parseLogoMode(requestUrl.searchParams.get("logoMode"));
    const logoScale = clamp(
      parseNumber(requestUrl.searchParams.get("logoScale"), 0.18),
      0.08,
      0.35,
    );
    const logoUrl = requestUrl.searchParams.get("logoUrl") || "";

    // Enforce Pro plan for custom or logo-free QR codes.
    if (logoMode === "custom" || logoMode === "none") {
      const viewer = await getSignedInAnalyticsViewer(getToken);
      if (!viewer) {
        return NextResponse.json(
          { error: "Your account is getting ready. Try again shortly." },
          { status: 503, headers: NO_STORE_HEADERS },
        );
      }
      if (viewer.plan !== "pro") {
        return NextResponse.json(
          { error: "Custom or logo-free QR codes require a Pro plan." },
          { status: 403, headers: NO_STORE_HEADERS },
        );
      }
    }

    // Validate optional custom domain against the authenticated user's active domains.
    const defaultDomain = canonicalHostname(getShortDomain());
    const requestedDomainRaw = requestUrl.searchParams.get("domain")?.trim();
    let verifiedCustomDomain: string | null = null;
    if (requestedDomainRaw) {
      const normalized = canonicalHostname(requestedDomainRaw);
      if (normalized && normalized !== defaultDomain) {
        if (!VALID_DOMAIN_PATTERN.test(normalized)) {
          return NextResponse.json(
            { error: "Invalid custom domain" },
            { status: 400, headers: NO_STORE_HEADERS },
          );
        }
        const activeDomains = await queryConvexAsUser<
          Array<{ domain?: unknown }>
        >(getToken, "customDomains:getActiveDomains");
        const ownsDomain =
          Array.isArray(activeDomains) &&
          activeDomains.some(
            (entry) =>
              typeof entry?.domain === "string" &&
              canonicalHostname(entry.domain) === normalized,
          );
        if (!ownsDomain) {
          return NextResponse.json(
            { error: "Custom domain is not active on your account" },
            { status: 403, headers: NO_STORE_HEADERS },
          );
        }
        verifiedCustomDomain = normalized;
      }
    }

    const target = `https://${makeShortLinkWithDomain(slug, verifiedCustomDomain)}`;

    // The logo, if any. A custom logo that can't be fetched falls back to ndle's badge.
    const logoSize = Math.max(8, Math.round(size * logoScale));
    let logo: QrLogo | undefined;
    if (logoMode === "brand") {
      logo = { href: getBrandBadgeDataUrl(fg), size: logoSize };
    } else if (logoMode === "custom" && logoUrl) {
      const dataUrl = await fetchImageAsDataUrl(logoUrl);
      if (dataUrl) {
        logo = { href: dataUrl, size: logoSize, backdrop: true };
      } else {
        logo = { href: getBrandBadgeDataUrl(fg), size: logoSize };
      }
    }

    let svg: string;
    try {
      svg = qrCodeSvg(target, { size, fg, bg, ecc, margin, logo });
    } catch (e) {
      console.error("[qr-api] qrcode generation failed", e);
      return NextResponse.json(
        { error: "QR generation failed" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }

    if (wantSvg) {
      return new NextResponse(svg, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          ...PRIVATE_CACHE_HEADERS,
        },
      });
    }

    try {
      const renderer = await Resvg.async(svg, {
        fitTo: { mode: "width", value: size },
      });
      try {
        const renderedImage = renderer.render();
        try {
          const pngBytes = renderedImage.asPng();
          const pngBody = pngBytes.buffer.slice(
            pngBytes.byteOffset,
            pngBytes.byteOffset + pngBytes.byteLength,
          ) as ArrayBuffer;
          return new NextResponse(pngBody, {
            status: 200,
            headers: {
              "Content-Type": "image/png",
              ...PRIVATE_CACHE_HEADERS,
            },
          });
        } finally {
          renderedImage.free();
        }
      } finally {
        renderer.free();
      }
    } catch (e) {
      console.error("[qr-api] png conversion failed", e);
      return NextResponse.json(
        { error: "PNG conversion failed" },
        { status: 500, headers: NO_STORE_HEADERS },
      );
    }
  } catch (err) {
    console.error("[qr-api] unhandled error", err);
    return NextResponse.json(
      { error: "Failed to generate QR" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }
}

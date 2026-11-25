export function getShortDomain(): string {
  const envValue = process.env.NEXT_PUBLIC_SHORT_DOMAIN?.trim();
  if (envValue) {
    return envValue.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
  return process.env.NODE_ENV === "development" ? "dev.ndle.fyi" : "ndle.fyi";
}

const PRODUCTION_APP_HOSTS = new Set(["ndle.app", "www.ndle.app"]);
export const DEFAULT_FILE_PROXY_URL = "https://proxy-file-worker-prod.sunny735084.workers.dev";
const DEVELOPMENT_FILE_PROXY_URL = "https://proxy-file-worker.sunny735084.workers.dev";

function parseAbsoluteHttpOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
  } catch {
    // Relative paths like "/apiv2" cannot be used as server-side fetch origins.
  }
  return null;
}

/**
 * Base URL of the file proxy that serves archived analytics files.
 * Production builds set NEXT_PUBLIC_FILE_PROXY_URL to "/apiv2" in the
 * Cloudflare build settings, and ndle.app/apiv2/* is routed to the production
 * proxy. If that setting goes missing, ndle.app still uses /apiv2 rather than
 * the development proxy. Everywhere else the development proxy stays the default.
 */
export function getFileProxyUrl(
  hostname = typeof window === "undefined" ? "" : window.location.hostname,
): string {
  if (process.env.NEXT_PUBLIC_FILE_PROXY_URL) {
    return process.env.NEXT_PUBLIC_FILE_PROXY_URL;
  }
  return PRODUCTION_APP_HOSTS.has(hostname) ? "/apiv2" : DEVELOPMENT_FILE_PROXY_URL;
}

/**
 * Absolute HTTP(S) origin of the file proxy for server-side fetches (e.g.
 * `/api/favicon`). Ignores relative browser paths such as `"/apiv2"`.
 */
export function getServerFileProxyOrigin(): string {
  return (
    parseAbsoluteHttpOrigin(process.env.FILE_PROXY_ORIGIN) ??
    parseAbsoluteHttpOrigin(process.env.NEXT_PUBLIC_FILE_PROXY_URL) ??
    DEFAULT_FILE_PROXY_URL
  );
}

/** Browser-facing favicon endpoint, routing through the configured file proxy when available. */
export function getFaviconEndpoint(
  hostname = typeof window === "undefined" ? "" : window.location.hostname,
): string {
  const base = getFileProxyUrl(hostname).trim().replace(/\/+$/, "");
  return base ? `${base}/favicon` : "/api/favicon";
}

export function makeShortLink(slugOrPath: string): string {
  const domain = getShortDomain();
  const path = String(slugOrPath || "").replace(/^\/+/, "");
  return path ? `${domain}/${path}` : domain;
}

/**
 * Create a short link with an optional custom domain.
 * If customDomain is provided, use it; otherwise use the default domain.
 */
export function makeShortLinkWithDomain(slugOrPath: string, customDomain?: string | null): string {
  const domain = customDomain || getShortDomain();
  const path = String(slugOrPath || "").replace(/^\/+/, "");
  return path ? `${domain}/${path}` : domain;
}

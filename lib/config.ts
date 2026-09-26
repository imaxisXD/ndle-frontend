export function getShortDomain(): string {
  const envValue = process.env.NEXT_PUBLIC_SHORT_DOMAIN?.trim();
  if (envValue) {
    return envValue.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
  return process.env.NODE_ENV === "development" ? "dev.ndle.fyi" : "ndle.fyi";
}

const PRODUCTION_APP_HOSTS = new Set(["ndle.app", "www.ndle.app"]);
const DEVELOPMENT_FILE_PROXY_URL =
  "https://proxy-file-worker.sunny735084.workers.dev";

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
  return PRODUCTION_APP_HOSTS.has(hostname)
    ? "/apiv2"
    : DEVELOPMENT_FILE_PROXY_URL;
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
export function makeShortLinkWithDomain(
  slugOrPath: string,
  customDomain?: string | null,
): string {
  const domain = customDomain || getShortDomain();
  const path = String(slugOrPath || "").replace(/^\/+/, "");
  return path ? `${domain}/${path}` : domain;
}

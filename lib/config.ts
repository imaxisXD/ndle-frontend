export function getShortDomain(): string {
  const envValue = process.env.NEXT_PUBLIC_SHORT_DOMAIN?.trim();
  if (envValue) {
    return envValue.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  }
  return process.env.NODE_ENV === "development" ? "dev.ndle.im" : "ndle.im";
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

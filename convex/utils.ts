import humanId from "human-id";
import { customAlphabet } from "nanoid";

export const VALIDATION_ERRORS = {
  INVALID_FORMAT: "INVALID_FORMAT",
  INVALID_PROTOCOL: "INVALID_PROTOCOL",
  MISSING_HOST: "MISSING_HOST",
  LOCALHOST_NOT_ALLOWED: "LOCALHOST_NOT_ALLOWED",
  PRIVATE_IP_NOT_ALLOWED: "PRIVATE_IP_NOT_ALLOWED",
  SUSPICIOUS_PATTERN: "SUSPICIOUS_PATTERN",
  URL_TOO_LONG: "URL_TOO_LONG",
  INVALID_PORT: "INVALID_PORT",
  BLACKLISTED_DOMAIN: "BLACKLISTED_DOMAIN",
  USERINFO_NOT_ALLOWED: "USERINFO_NOT_ALLOWED",
  SELF_DOMAIN_NOT_ALLOWED: "SELF_DOMAIN_NOT_ALLOWED",
} as const;

// ndle's own domains - prevent redirect loops and abuse
const SELF_DOMAINS = [
  "ndle.app",
  "ndle.fyi",
  "www.ndle.fyi",
  "ndle.im",
  "www.ndle.im",
  "dev.ndle.app",
  "dev.ndle.fyi",
  "www.dev.ndle.fyi",
  "dev.ndle.im",
  "imp.ndle.app",
];

const CONFIG = {
  maxLength: 2048, // Max URL length
  allowLocalhost: false, // Set true for dev/testing
  allowPrivateIPs: false, // Set true if needed
  allowedProtocols: ["http:", "https:"],
  blacklistedDomains: [
    // Domains known for phishing or malware distribution
    "phishing-login.test",
    "malware-distribution.test",
    "credential-harvest.invalid",
    "verify-account-now.example",
    // Phishing lookalike domains
    "xn--paypa1-6ve.com",
    "paypa1.com",
    "paypai.com",
    "paypal-verify.com",
    "paypal-security.com",
    "apple-id-verify.com",
    "apple-security.com",
    "appleid-verify.com",
    "microsoft-verify.com",
    "microsoft-security.com",
    "office365-login.com",
    "google-verify.com",
    "google-security.com",
    "gmail-login.com",
    "facebook-verify.com",
    "instagram-verify.com",
    // Other URL shorteners (prevent redirect chains)
    "bit.ly",
    "tinyurl.com",
    "t.co",
    "goo.gl",
    "ow.ly",
    "is.gd",
    "buff.ly",
    "rebrand.ly",
    "short.io",
  ],
  // Only http(s) schemes are accepted (allowedProtocols), so "data:" or "@" in a
  // path or query is harmless; embedded credentials are rejected after parsing.
  suspiciousPatterns: [/javascript:/i, /vbscript:/i, /file:/i],
};

export interface RedisValueObject {
  // Essential (always needed)
  destination: string;
  tenant_id: string;
  user_id?: string;
  analytics_owner_key: string;
  convex_user_id?: string;
  redirect_type: 301 | 302 | 307 | 308;
  // Custom hostname this link is bound to; null means the default short domain only
  domain: string | null;
  // Tracking
  created_at: number;
  updated_at: number;
  link_id: string;
  // State management
  is_active: boolean;
  expires_at: number | null;
  max_clicks: number | null;
  // Analytics tags (keep arrays small)
  tags?: Array<string>;
  utm_params?: Record<string, string>;
  // Smart routing (only if needed)
  rules?: {
    geo?: Record<string, string>; // {"US": "url1", "GB": "url2"}
    device?: Record<string, string>; // {"mobile": "url1", "desktop": "url2"}
    ab_test?: {
      enabled: boolean;
      variants: Array<{
        id: string;
        url: string;
        weight: number;
      }>;
      distribution: "weighted_random" | "deterministic";
    };
  };
  // Feature flags
  features: {
    track_clicks: boolean;
    track_conversions: boolean;
    enable_preview?: boolean;
    password_protected?: boolean;
  };
  custom_metadata: Record<string, string>;
  version: number;
}

/**
 * Canonical form of a stored custom hostname: lowercase, no port, no trailing dot.
 * Stored values already went through the input normalizer, so this must not strip
 * anything else (e.g. another "www.") or the Worker's host comparison would fail.
 */
export function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/:\d*$/, "").replace(/\.$/, "");
}

/**
 * Hostname as the browser resolves it: lowercase, without trailing dots, so
 * "bit.ly." cannot slip past a block on "bit.ly".
 */
export function canonicalHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.+$/, "");
}

/** Canonical hostname of an http(s) destination, or null when it cannot be parsed. */
export function destinationHostname(url: string): string | null {
  try {
    return canonicalHostname(new URL(url.trim()).hostname) || null;
  } catch {
    return null;
  }
}

/** The hostname followed by each parent domain: a.b.example.com, b.example.com, example.com, com. */
export function hostnameWithParents(hostname: string): string[] {
  const labels = canonicalHostname(hostname).split(".").filter(Boolean);
  return labels.map((_, index) => labels.slice(index).join("."));
}

export function isHostOrSubdomainOf(hostname: string, domain: string): boolean {
  const host = canonicalHostname(hostname);
  const parent = canonicalHostname(domain);
  return !!parent && (host === parent || host.endsWith(`.${parent}`));
}

/**
 * Operator input for a domain block ("evil.example", "https://evil.example/x",
 * "*.evil.example") as a canonical hostname, or null when it is not a hostname.
 */
export function normalizeBlockedDomainInput(input: string): string | null {
  const value = input.trim().toLowerCase().replace(/^\*\./, "");
  if (!value) return null;
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//.test(value) ? value : `http://${value}`;
  try {
    const hostname = canonicalHostname(new URL(candidate).hostname);
    return hostname || null;
  } catch {
    return null;
  }
}

/**
 * Check if the hostname is localhost
 */
function isLocalhost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

/** URL keeps IPv6 literals in brackets ("[::1]"); the address checks need them bare. */
function withoutIPv6Brackets(hostname: string) {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

/**
 * Private (RFC 1918), loopback, link-local and metadata, CGNAT, benchmarking,
 * multicast and reserved IPv4. Octets out of range count as private.
 */
function isPrivateIPv4(parts: number[]) {
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 0 || b === 168)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

/** The eight 16-bit groups of an IPv6 address, or null when it is not one. */
function parseIPv6(address: string): number[] | null {
  let value = address.toLowerCase();
  // A dotted IPv4 tail ("::ffff:127.0.0.1") is the last two groups.
  const dotted = /^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(value);
  if (dotted) {
    const octets = dotted[2].split(".").map(Number);
    if (octets.some((octet) => octet > 255)) return null;
    const high = ((octets[0] << 8) | octets[1]).toString(16);
    const low = ((octets[2] << 8) | octets[3]).toString(16);
    value = `${dotted[1]}${high}:${low}`;
  }

  const halves = value.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [
    ...head,
    ...Array<string>(halves.length === 2 ? missing : 0).fill("0"),
    ...tail,
  ];
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => parseInt(group, 16));
}

/**
 * Loopback (::1), unspecified (::), unique-local (fc00::/7), link-local
 * (fe80::/10), site-local (fec0::/10) and multicast (ff00::/8) IPv6, and any
 * form that embeds a blocked IPv4 address: IPv4-mapped (::ffff:a.b.c.d),
 * IPv4-compatible (::a.b.c.d), IPv4-translated (::ffff:0:a.b.c.d) and NAT64
 * (64:ff9b::a.b.c.d). An address that does not parse counts as private.
 */
function isPrivateIPv6(address: string) {
  const groups = parseIPv6(address);
  if (!groups) return true;

  const [first] = groups;
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xffc0) === 0xfec0) return true;
  if ((first & 0xff00) === 0xff00) return true;

  const zeroUntil = (end: number) =>
    groups.slice(0, end).every((group) => group === 0);
  const embedsIPv4 =
    (zeroUntil(5) && (groups[5] === 0 || groups[5] === 0xffff)) ||
    (zeroUntil(4) && groups[4] === 0xffff && groups[5] === 0) ||
    (groups[0] === 0x64 &&
      groups[1] === 0xff9b &&
      groups.slice(2, 6).every((group) => group === 0));
  if (embedsIPv4) {
    // Also covers :: (0.0.0.0) and ::1 (0.0.0.1).
    return isPrivateIPv4([
      groups[6] >> 8,
      groups[6] & 0xff,
      groups[7] >> 8,
      groups[7] & 0xff,
    ]);
  }
  return false;
}

/**
 * Check if the host is a private or internal address. Expects the hostname
 * without IPv6 brackets.
 */
function isPrivateIP(hostname: string) {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return isPrivateIPv4(hostname.split(".").map(Number));
  }
  if (hostname.includes(":")) {
    return isPrivateIPv6(hostname);
  }
  return false;
}

/**
 * Check for suspicious patterns that might indicate XSS or other attacks
 */
function hasSuspiciousPatterns(url: string) {
  for (const pattern of CONFIG.suspiciousPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if domain is blacklisted
 */
function isBlacklistedDomain(hostname: string) {
  return CONFIG.blacklistedDomains.some((domain) =>
    isHostOrSubdomainOf(hostname, domain),
  );
}

/**
 * Check if domain is ndle's own domain (prevent redirect loops and abuse)
 */
function isSelfDomain(hostname: string): boolean {
  return SELF_DOMAINS.some((domain) => isHostOrSubdomainOf(hostname, domain));
}

/**
 * Validate HTTP/HTTPS URL with comprehensive security checks
 *
 * @param {string} urlString - The URL string to validate
 * @param {Object} options - Optional configuration overrides
 * @returns {Object} - { valid: boolean, url: URL|null, error: string|null, errorCode: string|null }
 */
export function isValidHttpUrl(
  urlString: string,
  options = {} as typeof CONFIG,
) {
  const config = { ...CONFIG, ...options } as typeof CONFIG;

  // Basic type check
  if (typeof urlString !== "string") {
    return {
      valid: false,
      url: null,
      error: "The link must be provided as text.",
      errorCode: VALIDATION_ERRORS.INVALID_FORMAT,
    };
  }

  // Trim whitespace
  urlString = urlString.trim();

  // Check length
  if (urlString.length === 0) {
    return {
      valid: false,
      url: null,
      error: "Please enter the link you want to shorten.",
      errorCode: VALIDATION_ERRORS.INVALID_FORMAT,
    };
  }

  if (urlString.length > config.maxLength) {
    return {
      valid: false,
      url: null,
      error: `This link is longer than the supported ${config.maxLength} characters. Try trimming unnecessary parameters first.`,
      errorCode: VALIDATION_ERRORS.URL_TOO_LONG,
    };
  }

  // Check for suspicious patterns before parsing
  if (hasSuspiciousPatterns(urlString)) {
    return {
      valid: false,
      url: null,
      error:
        "The link includes characters we cannot safely shorten. Double-check for scripts or unusual symbols.",
      errorCode: VALIDATION_ERRORS.SUSPICIOUS_PATTERN,
    };
  }

  // Parse URL
  let url;
  try {
    url = new URL(urlString);
  } catch (err) {
    console.log("err", err);
    return {
      valid: false,
      url: null,
      error:
        "We could not read that link. Make sure it is a complete URL, such as https://example.com.",
      errorCode: VALIDATION_ERRORS.INVALID_FORMAT,
    };
  }

  // Validate protocol
  if (!config.allowedProtocols.includes(url.protocol)) {
    return {
      valid: false,
      url: null,
      error: `Links must start with ${config.allowedProtocols.join(" or ")}.`,
      errorCode: VALIDATION_ERRORS.INVALID_PROTOCOL,
    };
  }

  // Validate hostname exists
  if (!url.hostname) {
    return {
      valid: false,
      url: null,
      error: "Include a valid website domain (for example, example.com).",
      errorCode: VALIDATION_ERRORS.MISSING_HOST,
    };
  }

  // Reject URLs containing userinfo (username/password)
  if (url.username || url.password) {
    return {
      valid: false,
      url: null,
      error:
        "For security, links cannot contain embedded usernames or passwords.",
      errorCode: VALIDATION_ERRORS.USERINFO_NOT_ALLOWED,
    };
  }

  // Trailing dots resolve to the same host, so they must not bypass the checks below.
  // IPv6 literals lose their brackets so "[::1]" is checked as "::1".
  const hostname = withoutIPv6Brackets(canonicalHostname(url.hostname));

  // Check for localhost
  if (!config.allowLocalhost && isLocalhost(hostname)) {
    return {
      valid: false,
      url: null,
      error: "Links to localhost or your own device are not supported.",
      errorCode: VALIDATION_ERRORS.LOCALHOST_NOT_ALLOWED,
    };
  }

  // Check for private IPs
  if (!config.allowPrivateIPs && isPrivateIP(hostname)) {
    return {
      valid: false,
      url: null,
      error:
        "Links to private or internal network addresses are not supported.",
      errorCode: VALIDATION_ERRORS.PRIVATE_IP_NOT_ALLOWED,
    };
  }

  // Check blacklisted domains
  if (isBlacklistedDomain(hostname)) {
    return {
      valid: false,
      url: null,
      error:
        "For safety, this domain has been blocked. Try a different destination.",
      errorCode: VALIDATION_ERRORS.BLACKLISTED_DOMAIN,
    };
  }

  // Check if redirecting to ndle's own domains (prevent loops/abuse)
  if (isSelfDomain(hostname)) {
    return {
      valid: false,
      url: null,
      error: "You cannot create a redirect to ndle's own domains.",
      errorCode: VALIDATION_ERRORS.SELF_DOMAIN_NOT_ALLOWED,
    };
  }

  // Validate port if present
  if (url.port) {
    const portNum = parseInt(url.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return {
        valid: false,
        url: null,
        error:
          "The port number in the link is outside the allowed range (1-65535).",
        errorCode: VALIDATION_ERRORS.INVALID_PORT,
      };
    }
  }

  return {
    valid: true,
    url: url,
    error: null,
    errorCode: null,
  };
}

/**
 * Create a slug
 *
 * @param {string} slugType - The slug type to create
 * @returns {string} - The created slug
 */

export function createSlug(slugType: "random" | "human"): string {
  if (slugType === "human") {
    return humanId({ capitalize: false });
  } else {
    const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);
    return nanoid();
  }
}

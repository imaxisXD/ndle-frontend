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
} as const;

const CONFIG = {
  maxLength: 2048, // Max URL length
  allowLocalhost: false, // Set true for dev/testing
  allowPrivateIPs: false, // Set true if needed
  allowedProtocols: ["http:", "https:"],
  blacklistedDomains: [
    // Domains known for phishing or malware distribution. Replace or extend as needed.
    "phishing-login.test",
    "malware-distribution.test",
    "credential-harvest.invalid",
    "verify-account-now.example",
    "xn--paypa1-6ve.com",
  ],
  suspiciousPatterns: [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /file:/i,
    /@/g, // Multiple @ symbols can be phishing attempts
  ],
};

export interface RedisValueObject {
  // Essential (always needed)
  destination: string;
  tenant_id: string;
  user_id: string;
  redirect_type: 301 | 302 | 307 | 308;
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
  utm_params?: {
    // Pre-parsed UTM for analytics
    source?: string;
    medium?: string;
    campaign?: string;
  };
  // Smart routing (only if needed)
  rules?: {
    geo?: Record<string, string>; // {"US": "url1", "GB": "url2"}
    device?: Record<string, string>; // {"mobile": "url1", "desktop": "url2"}
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

/**
 * Check if IP is private (RFC 1918)
 */
function isPrivateIP(hostname: string) {
  // IPv4 private ranges
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    const parts = hostname.split(".").map(Number);

    // 10.0.0.0 - 10.255.255.255
    if (parts[0] === 10) return true;

    // 172.16.0.0 - 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;

    // 192.168.0.0 - 192.168.255.255
    if (parts[0] === 192 && parts[1] === 168) return true;

    // 169.254.0.0 - 169.254.255.255 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
  }

  // IPv6 private ranges
  if (hostname.includes(":")) {
    const lower = hostname.toLowerCase();
    return (
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80:")
    );
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

  // Check for excessive @ symbols (potential phishing)
  const atCount = (url.match(/@/g) || []).length;
  if (atCount > 1) return true;

  return false;
}

/**
 * Check if domain is blacklisted
 */
function isBlacklistedDomain(hostname: string) {
  const lowerHostname = hostname.toLowerCase();
  return CONFIG.blacklistedDomains.some(
    (domain) =>
      lowerHostname === domain.toLowerCase() ||
      lowerHostname.endsWith("." + domain.toLowerCase()),
  );
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

  // Check for localhost
  if (!config.allowLocalhost && isLocalhost(url.hostname)) {
    return {
      valid: false,
      url: null,
      error: "Links to localhost or your own device are not supported.",
      errorCode: VALIDATION_ERRORS.LOCALHOST_NOT_ALLOWED,
    };
  }

  // Check for private IPs
  if (!config.allowPrivateIPs && isPrivateIP(url.hostname)) {
    return {
      valid: false,
      url: null,
      error:
        "Links to private or internal network addresses are not supported.",
      errorCode: VALIDATION_ERRORS.PRIVATE_IP_NOT_ALLOWED,
    };
  }

  // Check blacklisted domains
  if (isBlacklistedDomain(url.hostname)) {
    return {
      valid: false,
      url: null,
      error:
        "For safety, this domain has been blocked. Try a different destination.",
      errorCode: VALIDATION_ERRORS.BLACKLISTED_DOMAIN,
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

// Analytics Cache Utilities

/**
 * Generate a cache key for analytics data
 */
export function generateCacheKey(params: {
  userId: string;
  range: string;
  linkSlug?: string;
  scope: string;
}): string {
  return `${params.userId}_${params.range}_${params.linkSlug || "all"}_${params.scope}`;
}

/**
 * Get TTL (time-to-live) in seconds based on the analytics range
 * - 24h range: 60s (1 min) - real-time data needs to be fresh
 * - 7d-30d: 180s (3 min) - recent data can be slightly stale
 * - 3mo+: 600s (10 min) - historical data can be more stale
 */
export function getTTLForRange(range: string): number {
  if (range === "24h") return 360;
  if (["7d", "30d"].includes(range)) return 480;
  return 600; // 3mo, 12mo, mtd, qtd, ytd, all
}

/**
 * Check if a cache entry is still valid based on TTL
 */
export function isCacheValid(cache: {
  created_at: number;
  ttl_seconds: number;
}): boolean {
  const nowInSeconds = Date.now() / 1000;
  return nowInSeconds - cache.created_at < cache.ttl_seconds;
}

export type DashboardTimeseriesRow = {
  bucket_start: string;
  clicks: number;
  human_clicks?: number;
  bot_clicks?: number;
  unique_sessions?: number;
  new_sessions?: number;
  avg_latency?: number | null;
};

export type DashboardBreakdownRow = {
  label: string | null;
  clicks: number;
  unique_sessions?: number;
  new_sessions?: number;
  human_clicks?: number;
  bot_clicks?: number;
  avg_latency?: number | null;
};

export type TinybirdResult<T> = {
  data: Array<T>;
};

export type DashboardAnalyticsPayload = {
  timeseries: TinybirdResult<DashboardTimeseriesRow>;
  browsers: TinybirdResult<DashboardBreakdownRow>;
  countries: TinybirdResult<DashboardBreakdownRow>;
  devices: TinybirdResult<DashboardBreakdownRow>;
  os: TinybirdResult<DashboardBreakdownRow>;
};

/**
 * Pure URL & IP address safety utilities shared across Next.js API routes,
 * browser validation, and Convex functions (zero Node/Next/Convex runtime deps).
 */

export const BLOCKED_LOCAL_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home.arpa",
] as const;

/**
 * Hostname as the browser resolves it: lowercase, without trailing dots, so
 * "bit.ly." cannot slip past a block on "bit.ly".
 */
export function canonicalHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.+$/, "");
}

/** URL keeps IPv6 literals in brackets ("[::1]"); the address checks need them bare. */
export function withoutIPv6Brackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1)
    : hostname;
}

/** Check if the hostname is localhost or a loopback literal. */
export function isLocalhost(hostname: string): boolean {
  const host = withoutIPv6Brackets(canonicalHostname(hostname));
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

/**
 * Private (RFC 1918), loopback, link-local and metadata, CGNAT, benchmarking,
 * multicast and reserved IPv4. Octets out of range count as private.
 */
export function isPrivateIPv4(parts: number[]): boolean {
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

/** Check a dotted-quad IPv4 string for private or reserved ranges. */
export function isPrivateIPv4String(ip: string): boolean {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return true;
  return isPrivateIPv4(ip.split(".").map(Number));
}

/** The eight 16-bit groups of an IPv6 address, or null when it is not one. */
export function parseIPv6(address: string): number[] | null {
  let value = withoutIPv6Brackets(address.trim().toLowerCase()).split("%")[0];
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
 * (fe80::/10), site-local (fec0::/10), documentation (2001:db8::/32), and
 * multicast (ff00::/8) IPv6, plus any form that embeds a blocked IPv4 address:
 * IPv4-mapped (::ffff:a.b.c.d), IPv4-compatible (::a.b.c.d), IPv4-translated
 * (::ffff:0:a.b.c.d) and NAT64 (64:ff9b::a.b.c.d). Unparseable values count as private.
 */
export function isPrivateIPv6(address: string): boolean {
  const groups = parseIPv6(address);
  if (!groups) return true;

  const [first, second] = groups;
  if ((first & 0xfe00) === 0xfc00) return true;
  if ((first & 0xffc0) === 0xfe80) return true;
  if ((first & 0xffc0) === 0xfec0) return true;
  if ((first & 0xff00) === 0xff00) return true;
  if (first === 0x2001 && second === 0x0db8) return true;

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

/** True when a hostname (with or without IPv6 brackets) is an IP literal. */
export function isIpLiteral(hostname: string): boolean {
  const host = withoutIPv6Brackets(canonicalHostname(hostname));
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
}

/**
 * Check if a host or IP literal is a private or internal address.
 * Handles both bracketed and bare IPv6 strings.
 */
export function isPrivateIP(hostname: string): boolean {
  const host = withoutIPv6Brackets(canonicalHostname(hostname));
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return isPrivateIPv4(host.split(".").map(Number));
  }
  if (host.includes(":")) {
    return isPrivateIPv6(host);
  }
  return false;
}

/** True if the hostname is a blocked local/internal suffix. */
export function hasBlockedLocalSuffix(hostname: string): boolean {
  const host = canonicalHostname(hostname);
  return BLOCKED_LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/**
 * Lightweight client/form validator for user-entered web URLs (with or without
 * http:// or https:// scheme), replacing validator.isURL.
 */
export function isValidWebUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;

  // Reject explicit non-http(s) schemes (e.g. javascript:, ftp:, data:, mailto:).
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return false;
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  const host = withoutIPv6Brackets(canonicalHostname(parsed.hostname));
  if (!host) return false;

  // Require at least one dot for hostnames (matches validator.isURL default require_tld: true)
  // or a valid IP literal.
  if (isIpLiteral(host)) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(host)
      ? host.split(".").every((part) => Number(part) <= 255)
      : parseIPv6(host) !== null;
  }

  const labels = host.split(".");
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$|^xn--[a-z0-9-]{2,}$/i.test(tld)) return false;
  return labels.every(
    (label) =>
      label.length >= 1 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
}

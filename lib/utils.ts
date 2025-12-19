import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving any conflicts.
 *
 * @param inputs - An array of class names to merge.
 * @returns A string of merged and optimized class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Windows-style folder name validation used across collection creation flows.
 * Rejects control chars, reserved names, trailing dot/space, and invalid symbols.
 */
export function getWindowsFolderNameError(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0)
    return "Collection name cannot be empty or whitespace";
  if (trimmed === "." || trimmed === "..") return "Name cannot be '.' or '..'";
  if (/[\x00-\x1f]/.test(trimmed))
    return "Name cannot contain control characters";
  if (/[<>:"/\\|?*]/.test(trimmed))
    return 'Name cannot contain < > : " / \\ | ? *';
  if (/[ .]$/.test(trimmed)) return "Name cannot end with a space or period";
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i.test(trimmed))
    return "Reserved Windows name not allowed";
  return null;
}

/**
 * Formats a timestamp relative to the current time.
 *
 * @param ts - The timestamp to format.
 * @returns A string representing the relative time.
 */

export function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;

  // Seconds
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    if (seconds < 10) return "just now";
    return `${seconds} sec ago`;
  }

  // Minutes
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  // Hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  // Days
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  // Months (approximate)
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  // Years
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/**
 * Formats a timestamp relative to the current time using compact notation.
 * Returns "now", "5m ago", "2h ago", "3d ago" format.
 *
 * @param timestamp - The timestamp to format (in milliseconds).
 * @returns A compact string representing the relative time.
 */
export function formatRelativeTimeCompact(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Formats a timestamp as a human-readable date.
 * Returns "Today", "Yesterday", or "X days ago" format.
 *
 * @param timestamp - The timestamp to format (in milliseconds).
 * @returns A human-readable string representing the relative date.
 */
export function formatRelativeDate(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// ============================================================================
// Health Monitoring Utilities
// ============================================================================

/**
 * API health status from the backend monitoring system.
 */
export type HealthStatus = "up" | "down" | "degraded";

/**
 * UI-friendly health status for display purposes.
 */
export type UIStatus = "healthy" | "warning" | "error";

/**
 * Maps backend health status to UI-friendly status.
 *
 * @param status - The health status from the API.
 * @returns The UI-friendly status string.
 */
export function mapHealthStatusToUI(status: HealthStatus): UIStatus {
  switch (status) {
    case "up":
      return "healthy";
    case "degraded":
      return "warning";
    case "down":
      return "error";
  }
}

/**
 * Returns a Tailwind text color class based on response time.
 *
 * @param time - Response time in milliseconds.
 * @returns Tailwind text color class.
 */
export function getResponseTimeColor(time: number): string {
  if (time === 0) return "text-red-600";
  if (time < 500) return "text-green-600";
  if (time < 1000) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Returns a Tailwind text color class based on uptime percentage.
 *
 * @param uptime - Uptime percentage (0-100).
 * @returns Tailwind text color class.
 */
export function getUptimeColor(uptime: number): string {
  if (uptime >= 99) return "text-green-600";
  if (uptime >= 90) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Returns a Tailwind background color class for uptime status bars.
 *
 * @param status - The status of the uptime bar.
 * @returns Tailwind background color class(es).
 */
export function getUptimeBarColor(status: string): string {
  switch (status) {
    case "healthy":
      return "bg-green-500";
    case "warning":
      return "bg-yellow-500";
    case "error":
      return "bg-red-500";
    case "future":
      return "bg-gray-100 border border-gray-300 border-dashed";
    default:
      return "bg-gray-300 border border-gray-400 border-dashed";
  }
}

/**
 * Map ISO 3166-1 alpha-2 country code (e.g., "US") to English country name (e.g., "United States").
 * Falls back to the input code if not found.
 */
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
  AF: "Afghanistan",
  AL: "Albania",
  DZ: "Algeria",
  AD: "Andorra",
  AO: "Angola",
  AR: "Argentina",
  AM: "Armenia",
  AU: "Australia",
  AT: "Austria",
  AZ: "Azerbaijan",
  BS: "Bahamas",
  BH: "Bahrain",
  BD: "Bangladesh",
  BB: "Barbados",
  BY: "Belarus",
  BE: "Belgium",
  BZ: "Belize",
  BJ: "Benin",
  BT: "Bhutan",
  BO: "Bolivia",
  BA: "Bosnia and Herzegovina",
  BW: "Botswana",
  BR: "Brazil",
  BN: "Brunei",
  BG: "Bulgaria",
  BF: "Burkina Faso",
  BI: "Burundi",
  KH: "Cambodia",
  CM: "Cameroon",
  CA: "Canada",
  CV: "Cape Verde",
  CF: "Central African Republic",
  TD: "Chad",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  KM: "Comoros",
  CG: "Congo",
  CR: "Costa Rica",
  CI: "Côte d’Ivoire",
  HR: "Croatia",
  CU: "Cuba",
  CY: "Cyprus",
  CZ: "Czechia",
  DK: "Denmark",
  DJ: "Djibouti",
  DO: "Dominican Republic",
  EC: "Ecuador",
  EG: "Egypt",
  SV: "El Salvador",
  EE: "Estonia",
  ET: "Ethiopia",
  FI: "Finland",
  FR: "France",
  GA: "Gabon",
  GM: "Gambia",
  GE: "Georgia",
  DE: "Germany",
  GH: "Ghana",
  GR: "Greece",
  GT: "Guatemala",
  GN: "Guinea",
  GY: "Guyana",
  HT: "Haiti",
  HN: "Honduras",
  HK: "Hong Kong",
  HU: "Hungary",
  IS: "Iceland",
  IN: "India",
  ID: "Indonesia",
  IR: "Iran",
  IQ: "Iraq",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JM: "Jamaica",
  JP: "Japan",
  JO: "Jordan",
  KZ: "Kazakhstan",
  KE: "Kenya",
  KR: "South Korea",
  KW: "Kuwait",
  KG: "Kyrgyzstan",
  LA: "Laos",
  LV: "Latvia",
  LB: "Lebanon",
  LY: "Libya",
  LT: "Lithuania",
  LU: "Luxembourg",
  MG: "Madagascar",
  MW: "Malawi",
  MY: "Malaysia",
  ML: "Mali",
  MT: "Malta",
  MX: "Mexico",
  MD: "Moldova",
  MN: "Mongolia",
  ME: "Montenegro",
  MA: "Morocco",
  MZ: "Mozambique",
  MM: "Myanmar",
  NA: "Namibia",
  NP: "Nepal",
  NL: "Netherlands",
  NZ: "New Zealand",
  NI: "Nicaragua",
  NE: "Niger",
  NG: "Nigeria",
  MK: "North Macedonia",
  NO: "Norway",
  OM: "Oman",
  PK: "Pakistan",
  PS: "Palestine",
  PA: "Panama",
  PY: "Paraguay",
  PE: "Peru",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RO: "Romania",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SN: "Senegal",
  RS: "Serbia",
  SG: "Singapore",
  SK: "Slovakia",
  SI: "Slovenia",
  ZA: "South Africa",
  ES: "Spain",
  LK: "Sri Lanka",
  SD: "Sudan",
  SE: "Sweden",
  CH: "Switzerland",
  SY: "Syria",
  TW: "Taiwan",
  TJ: "Tajikistan",
  TZ: "Tanzania",
  TH: "Thailand",
  TL: "Timor-Leste",
  TN: "Tunisia",
  TR: "Turkey",
  TM: "Turkmenistan",
  UG: "Uganda",
  UA: "Ukraine",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VE: "Venezuela",
  VN: "Vietnam",
  YE: "Yemen",
  ZM: "Zambia",
  ZW: "Zimbabwe",
};

export function countryCodeToName(code: string): string {
  const upper = code?.toUpperCase?.() || code;
  return COUNTRY_CODE_TO_NAME[upper] || upper;
}

/**
 * Convert ISO alpha-2 code (e.g., "US") to a flag emoji (🇺🇸).
 * Returns an empty string for invalid codes.
 */
export function countryCodeToFlagEmoji(code: string): string {
  if (!code || code.length < 2) return "";
  const upper = code.slice(0, 2).toUpperCase();
  // A (65) -> regional indicator 127462, so add 127397
  const base = 127397;
  const chars = Array.from(upper)
    .map((c) => c.charCodeAt(0))
    .filter((cp) => cp >= 65 && cp <= 90)
    .map((cp) => base + cp);
  if (chars.length !== 2) return "";
  try {
    return String.fromCodePoint(chars[0], chars[1]);
  } catch {
    return "";
  }
}

/**
 * Map abbreviated weekday names to their full forms.
 */
const WEEKDAY_ABBREVIATIONS: Record<string, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

/**
 * Expands an abbreviated weekday name to its full form.
 * Case-insensitive: "sun", "Sun", "SUN" all become "Sunday".
 *
 * @param abbreviation - The abbreviated weekday name (e.g., "sun", "mon").
 * @returns The full weekday name (e.g., "Sunday", "Monday"), or the original input if not recognized.
 */
export function expandWeekday(abbreviation: string): string {
  if (!abbreviation) return abbreviation;
  const lower = abbreviation.toLowerCase();
  return WEEKDAY_ABBREVIATIONS[lower] || abbreviation;
}

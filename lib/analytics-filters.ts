/**
 * Analytics Filter Configuration
 *
 * This file defines all available filters for the analytics dashboard.
 * To add a new filter, simply add a new entry to FILTER_CONFIGS.
 *
 * Each filter config includes:
 * - id: Unique identifier used in state and URLs
 * - label: Display name in the UI
 * - icon: Phosphor icon component
 * - column: DuckDB column name for this filter
 * - optionsQuery: SQL to get distinct values (use {table} placeholder)
 * - normalize: Transform raw DB values to consistent format
 * - getLabel: Convert value to user-friendly display label
 * - buildWhereClause: Generate SQL WHERE condition for filtering
 */

import {
  GlobeIcon,
  DevicesIcon,
  BrowserIcon,
  DesktopIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

// --- Types ---

export interface FilterConfig {
  /** Unique filter identifier */
  id: string;
  /** Display label in UI */
  label: string;
  /** Phosphor icon component */
  icon: Icon;
  /** DuckDB column name */
  column: string;
  /** SQL query to get distinct options. Use {table} as placeholder. */
  optionsQuery: string;
  /** Normalize raw DB value to consistent format */
  normalize: (value: string) => string;
  /** Convert value to user-friendly label */
  getLabel: (value: string) => string;
  /** Generate SQL WHERE clause for this value */
  buildWhereClause: (value: string) => string;
  /** Default value (usually "all") */
  defaultValue: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

// --- Country Code Mapping ---

export const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  CA: "Canada",
  AU: "Australia",
  JP: "Japan",
  BR: "Brazil",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  RU: "Russia",
  CN: "China",
  KR: "South Korea",
  MX: "Mexico",
  ID: "Indonesia",
  PH: "Philippines",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  VN: "Vietnam",
  PK: "Pakistan",
  BD: "Bangladesh",
  NG: "Nigeria",
  ZA: "South Africa",
  EG: "Egypt",
  AE: "UAE",
  SA: "Saudi Arabia",
  TR: "Turkey",
  PL: "Poland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  PT: "Portugal",
  GR: "Greece",
  CZ: "Czech Republic",
  RO: "Romania",
  HU: "Hungary",
  IE: "Ireland",
  NZ: "New Zealand",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  VE: "Venezuela",
  IL: "Israel",
  UA: "Ukraine",
};

// --- Normalization Functions ---

function normalizeIdentity(value: string): string {
  return value;
}

function normalizeBrowser(browser: string): string {
  const lower = browser.toLowerCase();
  if (lower.includes("chrome") && !lower.includes("chromium")) return "Chrome";
  if (lower.includes("safari") && !lower.includes("chrome")) return "Safari";
  if (lower.includes("firefox")) return "Firefox";
  if (lower.includes("edge")) return "Edge";
  if (lower.includes("brave")) return "Brave";
  if (lower.includes("opera")) return "Opera";
  if (lower.includes("samsung")) return "Samsung Internet";
  if (lower.includes("vivaldi")) return "Vivaldi";
  return browser;
}

function normalizeOS(os: string): string {
  const lower = os.toLowerCase();
  if (lower.includes("mac")) return "macOS";
  if (lower.includes("windows")) return "Windows";
  if (lower.includes("ios")) return "iOS";
  if (lower.includes("android")) return "Android";
  if (lower.includes("linux")) return "Linux";
  if (lower.includes("chrome")) return "ChromeOS";
  return os;
}

function normalizeDevice(device: string): string {
  const lower = device.toLowerCase();
  if (lower.includes("desktop")) return "Desktop";
  if (lower.includes("mobile")) return "Mobile";
  if (lower.includes("tablet")) return "Tablet";
  return device;
}

/**
 * Sanitize a value for safe SQL interpolation
 * Escapes single quotes to prevent SQL injection
 */
export function sanitizeSQLValue(value: string): string {
  return value.replace(/'/g, "''");
}

// --- Filter Configurations ---

export const FILTER_CONFIGS: FilterConfig[] = [
  {
    id: "country",
    label: "Country",
    icon: GlobeIcon,
    column: "country",
    optionsQuery:
      "SELECT DISTINCT country FROM {table} WHERE country IS NOT NULL ORDER BY country",
    normalize: normalizeIdentity,
    getLabel: (code) => COUNTRY_NAMES[code] || code,
    buildWhereClause: (value) => `country = '${sanitizeSQLValue(value)}'`,
    defaultValue: "all",
  },
  {
    id: "device",
    label: "Device",
    icon: DevicesIcon,
    column: "device_type",
    optionsQuery:
      "SELECT DISTINCT device_type FROM {table} WHERE device_type IS NOT NULL",
    normalize: normalizeDevice,
    getLabel: (value) => value,
    buildWhereClause: (value) =>
      `LOWER(device_type) = LOWER('${sanitizeSQLValue(value)}')`,
    defaultValue: "all",
  },
  {
    id: "browser",
    label: "Browser",
    icon: BrowserIcon,
    column: "browser",
    optionsQuery:
      "SELECT DISTINCT browser FROM {table} WHERE browser IS NOT NULL",
    normalize: normalizeBrowser,
    getLabel: (value) => value,
    buildWhereClause: (value) =>
      `LOWER(browser) LIKE LOWER('%${sanitizeSQLValue(value)}%')`,
    defaultValue: "all",
  },
  {
    id: "os",
    label: "OS",
    icon: DesktopIcon,
    column: "os",
    optionsQuery: "SELECT DISTINCT os FROM {table} WHERE os IS NOT NULL",
    normalize: normalizeOS,
    getLabel: (value) => value,
    buildWhereClause: (value) =>
      `LOWER(os) LIKE LOWER('%${sanitizeSQLValue(value)}%')`,
    defaultValue: "all",
  },
  {
    id: "link",
    label: "Link",
    icon: LinkSimpleIcon,
    column: "short_url",
    optionsQuery:
      "SELECT DISTINCT coalesce(short_url, link_slug) as url FROM {table} WHERE short_url IS NOT NULL OR link_slug IS NOT NULL",
    normalize: normalizeIdentity,
    getLabel: (value) => {
      // Strip protocol and domain, show just the path/slug
      try {
        const url = new URL(value);
        return url.pathname;
      } catch {
        // If not a valid URL, just return the value (likely already a slug)
        return value.startsWith("/") ? value : `/${value}`;
      }
    },
    buildWhereClause: (value) =>
      `(short_url = '${sanitizeSQLValue(value)}' OR link_slug = '${sanitizeSQLValue(value)}')`,
    defaultValue: "all",
  },
];

// --- Helper Functions ---

/**
 * Get a filter config by ID
 */
export function getFilterById(id: string): FilterConfig | undefined {
  return FILTER_CONFIGS.find((f) => f.id === id);
}

/**
 * Build a complete WHERE clause from multiple filter values
 * @param filters - Object with filter id as key and value as the selected option
 * @param excludeBots - Whether to exclude bot traffic
 */
export function buildFullWhereClause(
  filters: Record<string, string>,
  excludeBots: boolean = true,
): string {
  const conditions: string[] = [];

  for (const [filterId, value] of Object.entries(filters)) {
    if (value && value !== "all") {
      const config = getFilterById(filterId);
      if (config) {
        conditions.push(config.buildWhereClause(value));
      }
    }
  }

  if (excludeBots) {
    conditions.push("is_bot = false");
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

/**
 * Process raw database values into normalized filter options
 * @param filterId - The filter to process
 * @param rawValues - Raw values from the database
 */
export function processFilterOptions(
  filterId: string,
  rawValues: string[],
): FilterOption[] {
  const config = getFilterById(filterId);
  if (!config) return [];

  // Normalize and deduplicate
  const normalizedSet = new Set<string>();
  for (const value of rawValues) {
    if (value) {
      normalizedSet.add(config.normalize(value));
    }
  }

  // Convert to options with labels (no "All X" option - user can remove filter instead)
  const options: FilterOption[] = [];

  const sorted = Array.from(normalizedSet).sort();
  for (const value of sorted) {
    options.push({
      value: value.toLowerCase(),
      label: config.getLabel(value),
    });
  }

  return options;
}

/**
 * Get default filter state object
 */
export function getDefaultFilterState(): Record<string, string> {
  const state: Record<string, string> = {};
  for (const config of FILTER_CONFIGS) {
    state[config.id] = config.defaultValue;
  }
  return state;
}

/**
 * Analytics V2 API Response Types
 *
 * Copied from: ndle-ingest-service/src/types/analytics-v2.ts
 * Keep in sync with backend when API changes.
 */

// ============================================
// RESPONSE TYPES
// ============================================

/** Filter option for dropdowns */
export interface FilterOption {
  value: string;
  label: string;
}

/** Device breakdown item */
export interface DeviceBreakdown {
  device: string;
  clicks: number;
}

/** Browser breakdown item */
export interface BrowserBreakdown {
  browser: string;
  clicks: number;
}

/** OS breakdown item */
export interface OSBreakdown {
  os: string;
  clicks: number;
}

/** Bot traffic breakdown */
export interface BotTraffic {
  human: number;
  bot: number;
}

/** Cold storage file reference */
export interface ColdFile {
  key: string;
  size: number;
}

/** Response metadata */
export interface AnalyticsMeta {
  range: {
    start: string;
    end: string;
  };
  cache_hits: number;
  duration_ms: number;
  files_count: number;
}

/** Filter options for all dimensions */
export interface FilterOptions {
  country: FilterOption[];
  device: FilterOption[];
  browser: FilterOption[];
  os: FilterOption[];
  link: FilterOption[];
}

/**
 * Main Analytics V2 Response
 *
 * GET /analytics/v2?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export interface AnalyticsV2Response {
  // Core aggregates (Record<dimension, count>)
  clicksByDay: Record<string, number>;
  countryCounts: Record<string, number>;
  linkCounts: Record<string, number>;
  totalClicks: number;

  // Filter options (for dropdowns)
  filterOptions: FilterOptions;

  // UTM Analytics
  utmSourceCounts: Record<string, number>;
  utmMediumCounts: Record<string, number>;
  utmCampaignCounts: Record<string, number>;
  utmTermCounts: Record<string, number>;
  utmContentCounts: Record<string, number>;
  /** Key format: "source|medium" */
  utmMatrixCounts: Record<string, number>;
  utmWithCount: number;
  utmWithoutCount: number;

  // Referer Analytics (domain -> clicks)
  refererCounts: Record<string, number>;

  // Additional aggregates (for backward compat)
  devices: DeviceBreakdown[];
  browsers: BrowserBreakdown[];
  os: OSBreakdown[];
  bot_traffic: BotTraffic;

  // Cold storage files (for client-side DuckDB-WASM)
  cold: ColdFile[];

  // Whether this is partial data (always false for v2)
  isPartialData: boolean;

  // Response metadata
  meta: AnalyticsMeta;
}

/**
 * Daily endpoint response
 *
 * GET /analytics/v2/daily?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
export interface AnalyticsV2DailyResponse {
  daily: Array<{ date: string; clicks: number }>;
  cached: boolean;
}

/**
 * Stats endpoint response
 *
 * GET /analytics/v2/stats
 */
export interface AnalyticsV2StatsResponse {
  cache_size: number;
  cache_max: number;
  cache_ttl_ms: number;
}

/**
 * Error response
 */
export interface AnalyticsV2ErrorResponse {
  error: string;
}

// ============================================
// DEPRECATED - Keep for backwards compatibility
// These were the old types before V2 refactor
// ============================================

/** @deprecated Use AnalyticsV2Response instead */
export interface AnalyticsResponse {
  hot: HotDataRow[];
  cold: ColdFile[];
  meta: {
    range: {
      start: string;
      end: string;
    };
    files_count: number;
    hot_count: number;
  };
}

/** @deprecated Raw event data - V2 returns aggregates instead */
export interface HotDataRow {
  // Core Identifiers
  idempotency_key: string;
  request_id: string;
  user_id: string;
  link_id: string;
  session_id?: string | null;

  // Link Details
  link_slug: string;
  short_url: string;
  destination_url: string;
  redirect_status: number;
  tracking_enabled: boolean;

  // Timestamp & Performance
  occurred_at: string;
  latency_ms_worker?: number | null;

  // Worker Info
  worker_datacenter?: string | null;
  worker_version?: string | null;

  // Client Info
  user_agent?: string | null;
  ip_hash?: string | null;
  is_bot: boolean;
  first_click_of_session: boolean;

  // Device & Browser (Derived)
  device_type?: string | null;
  browser?: string | null;
  os?: string | null;

  // Geo
  country?: string | null;
  region?: string | null;
  city?: string | null;
  language?: string | null;
  timezone?: string | null;

  // Referrer & Marketing
  referer?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}

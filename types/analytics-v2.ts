/**
 * Analytics V2 API Response Types
 *
 * Matches GET /analytics/v2 from ndle-ingest-service.
 */

export interface FilterOption {
  value: string;
  label: string;
}

export interface DeviceBreakdown {
  device: string;
  clicks: number;
}

export interface BrowserBreakdown {
  browser: string;
  clicks: number;
}

export interface OSBreakdown {
  os: string;
  clicks: number;
}

export interface BotTraffic {
  human: number;
  bot: number;
}

export interface ColdFile {
  key: string;
  size: number;
}

export interface AnalyticsMeta {
  history?: { status: "unverified"; before: string };
  analyticsVersion?: number;
  coverage?: { start: string; end: string; complete: boolean; source: string };
  freshness?: {
    lastCommittedAt: number | string | null;
    bufferedEvents: number;
    queuedEvents?: number;
  };
  range: {
    start: string;
    end: string;
  };
  cache_hits: number;
  duration_ms: number;
  files_count: number;
}

export interface FilterOptions {
  country: FilterOption[];
  device: FilterOption[];
  browser: FilterOption[];
  os: FilterOption[];
  link: FilterOption[];
}

export interface AnalyticsV2Response {
  clicksByDay: Record<string, number>;
  countryCounts: Record<string, number>;
  linkCounts: Record<string, number>;
  totalClicks: number;

  filterOptions: FilterOptions;

  utmSourceCounts: Record<string, number>;
  utmMediumCounts: Record<string, number>;
  utmCampaignCounts: Record<string, number>;
  utmTermCounts: Record<string, number>;
  utmContentCounts: Record<string, number>;
  /** Key format: "source|medium" */
  utmMatrixCounts: Record<string, number>;
  utmWithCount: number;
  utmWithoutCount: number;

  refererCounts: Record<string, number>;

  devices: DeviceBreakdown[];
  browsers: BrowserBreakdown[];
  os: OSBreakdown[];
  bot_traffic: BotTraffic;

  cold: ColdFile[];
  hot?: ColdFile | null;
  isPartialData: boolean;
  meta: AnalyticsMeta;
}

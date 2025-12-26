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
  occurred_at: string; // Timestamps are typically strings in JSON
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

export interface ColdFile {
  key: string;
  size: number;
}

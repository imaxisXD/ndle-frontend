"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsRange } from "@/lib/analyticsRanges";
import { browserTimeZone } from "@/lib/local-dates";
import { analyticsRequestError } from "@/lib/analytics-request";

type Scope = "user" | "link";

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    search.append(k, String(v));
  }
  return search.toString();
}

/** Bots are included unless the viewer turns on the "exclude bots" filter. */
const botsParam = (excludeBots: boolean) => (excludeBots ? "true" : undefined);

export function useTimeseries({
  range,
  linkSlug,
  scope,
  enabled = true,
  excludeBots = false,
}: {
  range: AnalyticsRange;
  linkSlug?: string;
  scope: Scope;
  enabled?: boolean;
  excludeBots?: boolean;
}) {
  const tz = browserTimeZone();
  return useQuery({
    queryKey: [
      "analytics",
      "timeseries",
      scope,
      linkSlug,
      range,
      tz,
      excludeBots,
    ],
    queryFn: async () => {
      const q = qs({
        range,
        link_slug: linkSlug,
        tz,
        exclude_bots: botsParam(excludeBots),
      });
      const res = await fetch(`/api/analytics/timeseries?${q}`);
      if (!res.ok)
        throw await analyticsRequestError(res, "Failed to load timeseries");
      return res.json();
    },
    enabled,
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

export function useBreakdown({
  dimension,
  range,
  linkSlug,
  scope,
  limit = 20,
  enabled = true,
  excludeBots = false,
}: {
  dimension: "browser" | "device" | "os" | "country" | "datacenter";
  range: AnalyticsRange;
  linkSlug?: string;
  scope: Scope;
  limit?: number;
  enabled?: boolean;
  excludeBots?: boolean;
}) {
  return useQuery({
    queryKey: [
      "analytics",
      "breakdown",
      scope,
      linkSlug,
      dimension,
      range,
      limit,
      excludeBots,
    ],
    queryFn: async () => {
      const q = qs({
        dimension,
        range,
        link_slug: linkSlug,
        limit,
        exclude_bots: botsParam(excludeBots),
      });
      const res = await fetch(`/api/analytics/breakdown?${q}`);
      if (!res.ok)
        throw await analyticsRequestError(res, "Failed to load breakdown");
      return res.json();
    },
    enabled,
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

export function useTopLinks({
  range,
  limit = 10,
  excludeBots = false,
}: {
  range: AnalyticsRange;
  limit?: number;
  excludeBots?: boolean;
}) {
  return useQuery({
    queryKey: ["analytics", "top-links", range, limit, excludeBots],
    queryFn: async () => {
      const q = qs({ range, limit, exclude_bots: botsParam(excludeBots) });
      const res = await fetch(`/api/analytics/top-links?${q}`);
      if (!res.ok)
        throw await analyticsRequestError(res, "Failed to load top links");
      return res.json();
    },
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

export function useTrafficSources({
  range,
  linkSlug,
  scope,
  limit = 20,
  enabled = true,
  excludeBots = false,
}: {
  range: AnalyticsRange;
  linkSlug?: string;
  scope: Scope;
  limit?: number;
  enabled?: boolean;
  excludeBots?: boolean;
}) {
  return useQuery({
    queryKey: [
      "analytics",
      "traffic-sources",
      scope,
      linkSlug,
      range,
      limit,
      excludeBots,
    ],
    queryFn: async () => {
      const q = qs({
        range,
        link_slug: linkSlug,
        limit,
        exclude_bots: botsParam(excludeBots),
      });
      const res = await fetch(`/api/analytics/traffic-sources?${q}`);
      if (!res.ok)
        throw await analyticsRequestError(
          res,
          "Failed to load traffic sources",
        );
      return res.json();
    },
    enabled,
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

/**
 * Hook to fetch live events data (last 60 minutes, minute-by-minute).
 * Polls every 10 seconds for near real-time updates.
 */
export function useLiveEvents({
  linkSlug,
  scope,
  enabled = true,
  excludeBots = false,
}: {
  linkSlug?: string;
  scope: Scope;
  enabled?: boolean;
  excludeBots?: boolean;
}) {
  return useQuery({
    queryKey: ["analytics", "live", scope, linkSlug, excludeBots],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (linkSlug) params.set("link_slug", linkSlug);
      if (excludeBots) params.set("exclude_bots", "true");
      const res = await fetch(`/api/analytics/live?${params.toString()}`);
      if (!res.ok)
        throw await analyticsRequestError(res, "Failed to load live events");
      return res.json() as Promise<{
        data: Array<{ minute_ts: string; clicks: number }>;
      }>;
    },
    enabled,
    staleTime: 5_000, // Consider stale after 5 seconds
    gcTime: 60_000, // Keep in cache for 1 minute
    refetchInterval: 10_000, // Poll every 10 seconds
    retry: false,
  });
}

export function useVariantPerformance({
  range,
  linkId,
  enabled = true,
  excludeBots = false,
}: {
  range: AnalyticsRange;
  linkId?: string;
  enabled?: boolean;
  excludeBots?: boolean;
}) {
  return useQuery({
    queryKey: [
      "analytics",
      "variants",
      "performance",
      linkId,
      range,
      excludeBots,
    ],
    queryFn: async () => {
      const q = qs({
        range,
        link_id: linkId,
        endpoint: "performance",
        exclude_bots: botsParam(excludeBots),
      });
      const res = await fetch(`/api/analytics/variants?${q}`);
      if (!res.ok)
        throw await analyticsRequestError(
          res,
          "Failed to load variant performance",
        );
      return res.json();
    },
    enabled: enabled && !!linkId,
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

export function useVariantTimeseries({
  range,
  linkId,
  enabled = true,
  excludeBots = false,
}: {
  range: AnalyticsRange;
  linkId?: string;
  enabled?: boolean;
  excludeBots?: boolean;
}) {
  return useQuery({
    queryKey: [
      "analytics",
      "variants",
      "timeseries",
      linkId,
      range,
      excludeBots,
    ],
    queryFn: async () => {
      const q = qs({
        range,
        link_id: linkId,
        endpoint: "timeseries",
        exclude_bots: botsParam(excludeBots),
      });
      const res = await fetch(`/api/analytics/variants?${q}`);
      if (!res.ok)
        throw await analyticsRequestError(
          res,
          "Failed to load variant timeseries",
        );
      return res.json();
    },
    enabled: enabled && !!linkId,
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

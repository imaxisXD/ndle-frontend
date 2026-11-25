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
      return res.json() as Promise<{
        variants: Array<{
          variant_id: string;
          clicks: number;
          percentage: string;
        }>;
        total: number;
      }>;
    },
    enabled: enabled && !!linkId,
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

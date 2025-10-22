"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsRange } from "@/lib/analyticsRanges";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

type Scope = "user" | "link";

function qs(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    search.append(k, String(v));
  }
  return search.toString();
}

export function useTimeseries({
  range,
  linkSlug,
  scope,
}: {
  range: AnalyticsRange;
  linkSlug?: string;
  scope: Scope;
}) {
  return useQuery({
    queryKey: ["analytics", "timeseries", scope, linkSlug, range],
    queryFn: async () => {
      const q = qs({ range, link_slug: linkSlug });
      const res = await fetch(`/api/analytics/timeseries?${q}`);
      if (!res.ok) throw new Error("Failed to load timeseries");
      return res.json();
    },
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
}: {
  dimension: "browser" | "device" | "os" | "country" | "datacenter";
  range: AnalyticsRange;
  linkSlug?: string;
  scope: Scope;
  limit?: number;
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
    ],
    queryFn: async () => {
      const q = qs({ dimension, range, link_slug: linkSlug, limit });
      const res = await fetch(`/api/analytics/breakdown?${q}`);
      if (!res.ok) throw new Error("Failed to load breakdown");
      return res.json();
    },
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

export function useTopLinks({
  range,
  limit = 10,
}: {
  range: AnalyticsRange;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["analytics", "top-links", range, limit],
    queryFn: async () => {
      const q = qs({ range, limit });
      const res = await fetch(`/api/analytics/top-links?${q}`);
      if (!res.ok) throw new Error("Failed to load top links");
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
}: {
  range: AnalyticsRange;
  linkSlug?: string;
  scope: Scope;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["analytics", "traffic-sources", scope, linkSlug, range, limit],
    queryFn: async () => {
      const q = qs({ range, link_slug: linkSlug, limit });
      const res = await fetch(`/api/analytics/traffic-sources?${q}`);
      if (!res.ok) throw new Error("Failed to load traffic sources");
      return res.json();
    },
    staleTime: 60_000,
    gcTime: 300_000,
    retry: false,
  });
}

// Batched dashboard analytics hook - fetches all analytics data in one request
// export function useDashboardAnalytics({
//   range,
//   linkSlug,
//   bypassCache = false,
// }: {
//   range: AnalyticsRange;
//   linkSlug?: string;
//   bypassCache?: boolean;
// }) {
//   const fetchDashboard = useAction(api.tinyBirdAction.getDashboardAnalytics);

//   return useQuery({
//     queryKey: ["analytics", "dashboard", linkSlug, range],
//     queryFn: async ({ signal }) => {
//       const data = await fetchDashboard({ range, linkSlug, bypassCache });
//       return data;
//     },
//     staleTime: 60_000,
//     gcTime: 300_000,
//     retry: false,
//   });
// }

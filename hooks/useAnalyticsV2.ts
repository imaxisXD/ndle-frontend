import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import type { AnalyticsV2Response } from "@/types/analytics-v2";

export interface AnalyticsFilters {
  country?: string; device?: string; browser?: string; os?: string; link?: string; excludeBots?: boolean;
}
interface UseAnalyticsV2Props { start: string; end: string; filters?: AnalyticsFilters; pollingInterval?: number }

export function useAnalyticsV2({ start, end, filters = {}, pollingInterval = 12000 }: UseAnalyticsV2Props) {
  const { userId, isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["analytics-v2", userId, start, end, filters],
    enabled: !!isSignedIn,
    queryFn: async ({ signal }): Promise<AnalyticsV2Response> => {
      const params = new URLSearchParams({ start, end });
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "all") params.set(key, String(value));
      }
      const response = await fetch(`/api/analytics/v2?${params}`, { signal, cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Analytics could not load (${response.status})`);
      }
      return response.json();
    },
    refetchInterval: pollingInterval, staleTime: 0, gcTime: 0,
    refetchOnMount: true, refetchOnWindowFocus: true,
  });
}

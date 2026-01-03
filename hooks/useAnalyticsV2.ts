import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { AnalyticsV2Response } from "@/types/analytics-v2";

interface UseAnalyticsV2Props {
  start: string;
  end: string;
  pollingInterval?: number;
}

/**
 * Hook to fetch analytics data from the V2 API.
 * Returns pre-aggregated data directly from the server.
 * User identity is determined server-side from JWT claims.
 */
export function useAnalyticsV2({ start, end }: UseAnalyticsV2Props) {
  return useQuery({
    queryKey: ["analytics-v2", start, end],
    queryFn: async (): Promise<AnalyticsV2Response> => {
      const params = new URLSearchParams({
        start,
        end,
      });

      const response = await fetch(`/api/analytics/v2?${params.toString()}`);

      if (!response.ok) {
        let errorMsg = `Failed to fetch analytics: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          console.error("Analytics API Error Response:", errorData);

          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch (e) {
          console.error("Failed to parse error JSON:", e);
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (process.env.NODE_ENV === "development") {
        console.log("[AnalyticsV2] Data received:", {
          totalClicks: data.totalClicks,
          days: Object.keys(data.clicksByDay).length,
          countries: Object.keys(data.countryCounts).length,
          coldFiles: data.cold?.length ?? 0,
        });
      }
      return data;
    },
    placeholderData: keepPreviousData,
    refetchInterval: 12000,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

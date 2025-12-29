import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { AnalyticsResponse } from "@/types/analytics-v2";

interface UseAnalyticsV2Props {
  start: string;
  end: string;
  pollingInterval?: number;
}

/**
 * Hook to fetch analytics data.
 * User identity is now determined server-side from JWT claims (not passed from frontend).
 */
export function useAnalyticsV2({ start, end }: UseAnalyticsV2Props) {
  return useQuery({
    queryKey: ["analytics-v2", start, end],
    queryFn: async (): Promise<AnalyticsResponse> => {
      const params = new URLSearchParams({
        start,
        end,
      });

      // No need to pass user ID - server reads it from JWT session claims
      const response = await fetch(`/api/analytics/v2?${params.toString()}`);

      if (!response.ok) {
        // Attempt to parse error message from response
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

      return response.json();
    },
    placeholderData: keepPreviousData, // Show old data while new loads
    refetchInterval: 12000,
    // Override global defaults - analytics needs fresh data, not cached
    staleTime: 0, // Always consider stale
    gcTime: 0, // Don't cache in memory
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
  });
}

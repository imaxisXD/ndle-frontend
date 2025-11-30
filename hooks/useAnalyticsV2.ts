import { useQuery } from "@tanstack/react-query";
import type { AnalyticsResponse } from "@/types/analytics-v2";

interface UseAnalyticsV2Props {
  start: string;
  end: string;
  userId?: string;
  pollingInterval?: number;
}

export function useAnalyticsV2({ start, end, userId }: UseAnalyticsV2Props) {
  return useQuery({
    queryKey: ["analytics-v2", start, end, userId],
    queryFn: async (): Promise<AnalyticsResponse> => {
      if (!userId) {
        console.error("User ID is required");
        throw new Error("User ID is required");
      }

      const params = new URLSearchParams({
        start,
        end,
      });

      const response = await fetch(`/api/analytics/v2?${params.toString()}`, {
        headers: {
          "x-convex-user-id": userId,
        },
      });

      if (!response.ok) {
        // Attempt to parse error message from response
        let errorMsg = `Failed to fetch analytics: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          console.error("Analytics API Error Response:", errorData); // Log raw error to console

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
    enabled: !!userId, // Only run when we have a user ID
    refetchInterval: 120000,
  });
}

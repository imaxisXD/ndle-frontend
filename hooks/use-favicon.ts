import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getFaviconEndpoint } from "@/lib/config";

/**
 * Hook to fetch favicon URL for a given URL.
 * Uses hostname as cache key since favicons are per-domain.
 */
export function useFavicon(url: string | null) {
  const parsed = url
    ? (() => {
        try {
          const parsedUrl = new URL(url);
          return {
            hostname: parsedUrl.hostname,
            origin: parsedUrl.origin,
          };
        } catch {
          return null;
        }
      })()
    : null;
  const hostname = parsed?.hostname ?? null;
  const origin = parsed?.origin ?? null;

  const {
    data: faviconUrl,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["favicon", origin],
    queryFn: async () => {
      if (!origin) return null;

      const apiPath = getFaviconEndpoint();
      const response = await fetch(`${apiPath}?url=${encodeURIComponent(origin)}`);

      if (!response.ok) {
        throw new Error(`Favicon fetch failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Favicon API returned an invalid response");
      }

      const data = await response.json();
      return data.faviconUrl as string;
    },
    enabled: !!hostname,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    structuralSharing: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  return {
    faviconUrl: faviconUrl ?? null,
    isLoading,
    error,
    hostname,
  };
}

import { useQuery, keepPreviousData } from "@tanstack/react-query";

const CACHE_KEY = "NDLE_QUERY_CACHE";

/**
 * Get favicon URL from localStorage cache synchronously
 * This provides instant data before React Query hydration
 */
function getFaviconFromCache(hostname: string): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return undefined;

    const parsed = JSON.parse(cached);
    const queries = parsed?.clientState?.queries;
    if (!queries) return undefined;

    const query = queries.find(
      (q: { queryKey: unknown[] }) =>
        q.queryKey[0] === "favicon" && q.queryKey[1] === hostname,
    );

    return query?.state?.data as string | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Hook to fetch favicon URL for a given URL
 * Uses hostname as cache key since favicons are per-domain
 * Implements aggressive caching with localStorage fallback
 *
 * @param url - The full URL to get favicon for
 * @returns { faviconUrl, isLoading, error }
 */
export function useFavicon(url: string | null) {
  // Extract hostname for cache key - favicons are per-domain, not per-URL
  const hostname = url
    ? (() => {
        try {
          return new URL(url).hostname;
        } catch {
          return null;
        }
      })()
    : null;

  // Get cached data synchronously for instant display
  const cachedData = hostname ? getFaviconFromCache(hostname) : undefined;

  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- Intentionally cache by hostname, not full URL
  const {
    data: faviconUrl,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["favicon", hostname],
    queryFn: async () => {
      if (!url) return null;

      // Use Cloudflare Worker for edge caching, fallback to local API
      const baseUrl = process.env.NEXT_PUBLIC_FILE_PROXY_URL || "";
      const apiPath = baseUrl ? `${baseUrl}/favicon` : "/api/getFavicon";
      const response = await fetch(`${apiPath}?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        // Throw on error so TanStack Query knows it failed and can retry
        throw new Error(`Favicon fetch failed: ${response.status}`);
      }

      const data = await response.json();
      return data.faviconUrl as string;
    },
    enabled: !!hostname,
    // Provide cached data immediately - prevents loading state flash
    initialData: cachedData,
    // Keep showing previous data while refetching (if ever needed)
    placeholderData: keepPreviousData,
    // Cache for 24 hours - allows retry after some time if failed
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days - keep in cache
    refetchOnMount: false, // Don't refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    // Disable structural sharing for simple string data - slight perf boost
    structuralSharing: false,
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
  });

  return {
    faviconUrl: faviconUrl ?? null,
    isLoading: isLoading && !cachedData, // Don't show loading if we have cached data
    error,
    hostname,
  };
}

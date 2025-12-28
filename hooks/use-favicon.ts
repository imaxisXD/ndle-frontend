import { useQuery } from "@tanstack/react-query";

/**
 * Hook to fetch favicon URL for a given URL
 * Uses hostname as cache key since favicons are per-domain
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

  // eslint-disable-next-line @tanstack/query/exhaustive-deps -- Intentionally cache by hostname, not full URL
  const {
    data: faviconUrl,
    isLoading,
    error,
    isFetching,
    isStale,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["favicon", hostname],
    queryFn: async () => {
      // DEBUG: This log means cache was NOT used
      console.log(`[Favicon] 🔥 FETCHING for hostname: ${hostname}`);

      if (!url) return null;

      try {
        // Use Cloudflare Worker for edge caching, fallback to local API
        const baseUrl = process.env.NEXT_PUBLIC_FILE_PROXY_URL || "";
        const apiPath = baseUrl ? `${baseUrl}/favicon` : "/api/getFavicon";
        const response = await fetch(
          `${apiPath}?url=${encodeURIComponent(url)}`,
        );

        if (!response.ok) {
          console.log(
            `[Favicon] ❌ Failed for ${hostname}: ${response.status}`,
          );
          return null;
        }

        const data = await response.json();
        console.log(`[Favicon] ✅ Got favicon for ${hostname}`);
        return data.faviconUrl as string;
      } catch (e) {
        console.log(`[Favicon] ❌ Error for ${hostname}:`, e);
        return null;
      }
    },
    enabled: !!hostname,
    // Explicit cache settings - favicons rarely change
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - don't refetch if cached
    gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days - keep in cache
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    refetchOnWindowFocus: false, // Don't refetch when tab regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: 1,
  });

  // DEBUG: Log cache status on every render
  if (hostname) {
    console.log(
      `[Favicon] 📊 ${hostname}: isLoading=${isLoading}, isFetching=${isFetching}, isStale=${isStale}, cached=${!!faviconUrl}, updatedAt=${dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : "never"}`,
    );
  }

  return {
    faviconUrl: faviconUrl ?? null,
    isLoading,
    error,
    hostname,
  };
}

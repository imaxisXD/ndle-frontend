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
  } = useQuery({
    queryKey: ["favicon", hostname],
    queryFn: async () => {
      if (!url) return null;

      try {
        // Use Cloudflare Worker for edge caching, fallback to local API
        const baseUrl = process.env.NEXT_PUBLIC_FILE_PROXY_URL || "";
        const apiPath = baseUrl ? `${baseUrl}/favicon` : "/api/getFavicon";
        const response = await fetch(
          `${apiPath}?url=${encodeURIComponent(url)}`,
        );

        if (!response.ok) return null;

        const data = await response.json();
        return data.faviconUrl as string;
      } catch {
        return null;
      }
    },
    enabled: !!hostname,
    // Inherits staleTime (7d) and gcTime (30d) from QueryClient defaults
    retry: 1,
  });

  return {
    faviconUrl: faviconUrl ?? null,
    isLoading,
    error,
    hostname,
  };
}

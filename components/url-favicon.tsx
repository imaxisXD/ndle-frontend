/* eslint-disable @tanstack/query/exhaustive-deps */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlobeSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface UrlFaviconProps {
  url: string;
  /** Size variant: 'sm' (24px) or 'md' (32px, default) */
  size?: "sm" | "md";
}

const sizeStyles = {
  sm: {
    container: "size-6 bg-zinc-100",
    icon: "size-4 text-zinc-400",
    img: "size-6",
  },
  md: {
    container: "size-8 bg-muted border border-dashed border-black/40",
    icon: "size-6 text-blue-500",
    img: "size-6",
  },
};

export function UrlFavicon({ url, size = "md" }: UrlFaviconProps) {
  const [imgError, setImgError] = useState(false);

  // Extract hostname for cache key - favicons are per-domain, not per-URL
  const hostname = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  })();

  const { data: faviconUrl, isLoading } = useQuery({
    queryKey: ["favicon", hostname],
    queryFn: async () => {
      // Use Cloudflare Worker for edge caching, fallback to local API
      const baseUrl = process.env.NEXT_PUBLIC_FILE_PROXY_URL || "";
      const apiPath = baseUrl ? `${baseUrl}/favicon` : "/api/getFavicon";
      const response = await fetch(`${apiPath}?url=${encodeURIComponent(url)}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.faviconUrl;
    },
    enabled: !!hostname,
    // Cache settings are inherited from QueryClient defaults in ConvexClientProvider
    retry: 1,
  });

  const showPlaceholder = isLoading || !faviconUrl || imgError;
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        styles.container,
      )}
    >
      {showPlaceholder ? (
        <GlobeSimpleIcon className={styles.icon} weight="duotone" />
      ) : (
        <img
          src={faviconUrl}
          alt=""
          className={cn("rounded-full object-cover", styles.img)}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

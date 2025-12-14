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
    icon: "size-5 text-blue-500",
    img: "size-5",
  },
};

export function UrlFavicon({ url, size = "md" }: UrlFaviconProps) {
  const [imgError, setImgError] = useState(false);
  const { data: faviconUrl, isLoading } = useQuery({
    queryKey: ["favicon", url],
    queryFn: async () => {
      const response = await fetch(
        `/api/getFavicon?url=${encodeURIComponent(url)}`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      return data.faviconUrl;
    },
    enabled: !!url,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - favicons rarely change
    gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days
    retry: 1,
    refetchOnWindowFocus: false,
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

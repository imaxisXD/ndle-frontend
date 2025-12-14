/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GlobeSimpleIcon } from "@phosphor-icons/react";

export function UrlFavicon({ url }: { url: string }) {
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

  return (
    <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-black/40">
      {showPlaceholder ? (
        <GlobeSimpleIcon className="size-5 text-blue-500" weight="duotone" />
      ) : (
        <img
          src={faviconUrl}
          alt=""
          className="size-5 rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

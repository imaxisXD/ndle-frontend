import { useState } from "react";
import Image from "next/image";
import { GlobeSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useFavicon } from "@/hooks/use-favicon";

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
  const { faviconUrl, isLoading } = useFavicon(url);

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
        <Image
          src={faviconUrl}
          alt=""
          width={24}
          height={24}
          className={cn("rounded-full object-cover", styles.img)}
          onError={() => setImgError(true)}
          unoptimized
        />
      )}
    </div>
  );
}

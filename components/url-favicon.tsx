import { useState } from "react";
import Image from "next/image";
import { GlobeSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useFavicon } from "@/hooks/use-favicon";
import { needsDarkBackdrop } from "@/lib/favicon-backdrop";

interface UrlFaviconProps {
  url: string;
  /** Show this image instead of looking the site's favicon up. */
  src?: string;
  /** Size variant: 'sm' (24px) or 'md' (32px, default) */
  size?: "sm" | "md";
}

const sizeStyles = {
  sm: {
    container: "size-6",
    light: "bg-zinc-100",
    dark: "bg-zinc-900",
    icon: "size-4 text-zinc-400",
    img: "size-6",
  },
  md: {
    container: "size-8 border border-dashed border-black/40",
    light: "bg-muted",
    // Keep the dashed border showing against the row, not the dark fill.
    dark: "bg-zinc-900 bg-clip-padding",
    icon: "size-6 text-blue-500",
    img: "size-6",
  },
};

// Favicons already read, so a remounted row starts on the right container.
const darkBackdrops = new Map<string, boolean>();

export function UrlFavicon({ url, src, size = "md" }: UrlFaviconProps) {
  const [imgError, setImgError] = useState(false);
  const fetched = useFavicon(src ? null : url);
  const faviconUrl = src ?? fetched.faviconUrl;
  const isLoading = !src && fetched.isLoading;
  const [darkBackdrop, setDarkBackdrop] = useState(
    () => !!faviconUrl && darkBackdrops.get(faviconUrl) === true,
  );

  const showPlaceholder = isLoading || !faviconUrl || imgError;
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        styles.container,
        darkBackdrop && !showPlaceholder ? styles.dark : styles.light,
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
          // Lets the favicon's pixels be read to pick its container.
          crossOrigin="anonymous"
          onLoad={(event) => {
            const dark =
              darkBackdrops.get(faviconUrl) ??
              needsDarkBackdrop(event.currentTarget);
            darkBackdrops.set(faviconUrl, dark);
            setDarkBackdrop(dark);
          }}
          onError={() => setImgError(true)}
          unoptimized
        />
      )}
    </div>
  );
}

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

// Favicons already read, so a remounted row shows its favicon straight away.
const darkBackdrops = new Map<string, boolean>();

export function UrlFavicon({ url, src, size = "md" }: UrlFaviconProps) {
  const [imgError, setImgError] = useState(false);
  const fetched = useFavicon(src ? null : url);
  const faviconUrl = src ?? fetched.faviconUrl;
  const isLoading = !src && fetched.isLoading;
  // Unknown until the favicon loads and is read.
  const [darkBackdrop, setDarkBackdrop] = useState(() =>
    faviconUrl ? darkBackdrops.get(faviconUrl) : undefined,
  );

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
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full",
            styles.img,
            darkBackdrop && "bg-linear-to-b from-neutral-700 to-black",
            // Hidden until it's read, so it doesn't jump onto the disc.
            darkBackdrop === undefined && "invisible",
          )}
        >
          <Image
            src={faviconUrl}
            alt=""
            width={24}
            height={24}
            // On the disc it's inset whole, so its edges aren't cropped.
            className={
              darkBackdrop
                ? "size-4"
                : cn("rounded-full object-cover", styles.img)
            }
            // Lets the favicon's pixels be read to pick what it sits on.
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
        </span>
      )}
    </div>
  );
}

import Image from "next/image";

import { cn } from "@/lib/utils";

const emptyStateImageSrc = {
  errorAnalytics: "/empty-states/error-analytics.webp",
  errorCollections: "/empty-states/error-collections.webp",
  errorLinks: "/empty-states/error-links.webp",
  errorMonitoring: "/empty-states/error-monitoring.webp",
  noAnalytics: "/empty-states/no-analytics.webp",
  noCollections: "/empty-states/no-collections.webp",
  noLinks: "/empty-states/no-links.webp",
  noMonitoring: "/empty-states/no-monitoring.webp",
} as const;

export type EmptyStateImageName = keyof typeof emptyStateImageSrc;

export function EmptyStateImage({
  name,
  alt,
  className,
}: {
  name: EmptyStateImageName;
  alt: string;
  className?: string;
}) {
  return (
    <Image
      alt={alt}
      className={cn("pointer-events-none h-auto select-none", className)}
      draggable={false}
      height={1024}
      priority={false}
      src={emptyStateImageSrc[name]}
      unoptimized
      width={1536}
    />
  );
}

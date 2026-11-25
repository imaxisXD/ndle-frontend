import type { Metadata } from "next";

const SITE_URL = "https://ndle.app";

export function buildPageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  const canonical = path.startsWith("/") ? path : `/${path}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type,
      title,
      description,
      url: `${SITE_URL}${canonical}`,
      siteName: "ndle",
    },
  };
}

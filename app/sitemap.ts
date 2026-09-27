import type { MetadataRoute } from "next";
import { ALTERNATIVES } from "./alternatives/pages";
import { POSTS } from "./blog/posts";
import { USE_CASES } from "./use-cases/pages";

// Only pages meant for search results: the home page at "/", then blog posts,
// comparison pages and use-case pages come from their registries; add tool pages here as they
// ship, and make each new section public in middleware.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://ndle.app/" },
    { url: "https://ndle.app/blog", lastModified: POSTS[0]?.updated ?? POSTS[0]?.published },
    ...POSTS.map((post) => ({
      url: `https://ndle.app/blog/${post.slug}`,
      lastModified: post.updated ?? post.published,
    })),
    ...ALTERNATIVES.map((page) => ({
      url: `https://ndle.app/alternatives/${page.slug}`,
      lastModified: page.checked,
    })),
    { url: "https://ndle.app/tools/link-checker", lastModified: "2026-09-28" },
    { url: "https://ndle.app/tools/utm-builder", lastModified: "2026-09-28" },
    ...USE_CASES.map((page) => ({
      url: `https://ndle.app/use-cases/${page.slug}`,
      lastModified: page.updated,
    })),
  ];
}

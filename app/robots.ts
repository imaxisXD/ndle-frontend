import type { MetadataRoute } from "next";

// The signed-in app (the react-router shell in app/_app-shell/app.tsx) and
// the API have nothing for search engines. Everything else, including future
// marketing pages, may be crawled.
const APP_PATHS = [
  "/dashboard",
  "/urls",
  "/analytics",
  "/monitoring",
  "/settings",
  "/collections",
  "/collection/",
  "/link/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ...APP_PATHS] },
    sitemap: "https://ndle.app/sitemap.xml",
  };
}

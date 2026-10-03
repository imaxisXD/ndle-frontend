import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@cf-wasm/resvg"],
  images: {
    remotePatterns: [
      { hostname: "img.clerk.com" },
      { hostname: "proxy-file-worker-prod.sunny735084.workers.dev" },
      { hostname: "www.google.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  reactCompiler: true,
  poweredByHeader: false,
  // Every page, including prerendered ones OpenNext serves from its cache.
  // The CSP only blocks framing, plugins and <base> rewrites; a script
  // allowlist needs Clerk, Convex, PostHog, Turnstile, orangereplay and the
  // DuckDB CDN tested first. Static files get theirs from public/_headers.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // The landing page took over "/"; its old addresses, and the old second
  // landing page's, send visitors there.
  async redirects() {
    return [
      { source: "/home-2", destination: "/", permanent: true },
      { source: "/landing-v2", destination: "/", permanent: true },
    ];
  },
};

// Blog posts are MDX files in content/blog, compiled at build time. Plugins are
// named as strings so Turbopack can load them. rehype-slug gives each heading
// the id the post's contents list links to. The JSX runtime goes through
// lib/mdx-runtime so the webpack dev server renders posts as server components.
const withMDX = createMDX({
  options: {
    jsxImportSource: "@/lib/mdx-runtime",
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: ["rehype-slug"],
  },
});

export default withMDX(nextConfig);

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

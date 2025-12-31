import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "img.clerk.com" },
      { hostname: "proxy-file-worker-dev.sunny735084.workers.dev" },
      { hostname: "www.google.com" },
    ],
  },
  rewrites: async () => [
    {
      source:
        "/((?!api/|_next/|favicon\\.ico|robots\\.txt|sitemap\\.xml|sign-in|sign-up).*)",
      destination: "/static-app-shell",
    },
  ],
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  reactCompiler: true,
};

export default nextConfig;

import type { NextConfig } from "next";

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

export default nextConfig;

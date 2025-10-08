import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ hostname: "img.clerk.com" }],
  },
  rewrites: async () => [
    {
      source:
        "/((?!api/|_next/|favicon\\.ico|robots\\.txt|sitemap\\.xml|sign-in|sign-up).*)",
      destination: "/static-app-shell",
    },
  ],
};

export default nextConfig;

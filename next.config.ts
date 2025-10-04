import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		domains: ["img.clerk.com"],
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

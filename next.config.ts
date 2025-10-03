import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	rewrites: async () => [
		{
			source: "/((?!api/|_next/|favicon\\.ico|robots\\.txt|sitemap\\.xml).*)",
			destination: "/static-app-shell",
		},
	],
};

export default nextConfig;

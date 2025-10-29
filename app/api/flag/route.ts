import { NextRequest, NextResponse } from "next/server";
import { getCacheHeadersPreset, CACHE_SCENARIOS } from "@/lib/cacheHeaders";

const FLAG_BASE_URL = "https://hatscripts.github.io/circle-flags/flags";

/**
 * Validates country code format (2 lowercase letters)
 */
function isValidCountryCode(code: string): boolean {
  return /^[a-z]{2}$/.test(code);
}

/**
 * GET /api/flag?code=us
 * Proxies flag images from hatscripts.github.io with Cloudflare CDN caching
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    // Validate country code
    if (!code || !isValidCountryCode(code)) {
      return NextResponse.json(
        { error: "Invalid country code. Expected 2 lowercase letters." },
        {
          status: 400,
          headers: CACHE_SCENARIOS.notFound(),
        },
      );
    }

    // Construct the flag URL
    const flagUrl = `${FLAG_BASE_URL}/${code}.svg`;

    try {
      // Fetch the flag image
      const response = await fetch(flagUrl, {
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FlagProxy/1.0)",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: "Flag not found" },
          {
            status: 404,
            headers: CACHE_SCENARIOS.notFound(),
          },
        );
      }

      // Get the SVG content
      const svgContent = await response.text();

      // Return the SVG with proper content type and cache headers
      // Flags are static assets, cache for a long time
      return new NextResponse(svgContent, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          ...getCacheHeadersPreset("STATIC"),
        },
      });
    } catch (error) {
      console.error(`Error fetching flag for code "${code}":`, error);
      return NextResponse.json(
        { error: "Failed to fetch flag" },
        {
          status: 500,
          headers: CACHE_SCENARIOS.serverError(),
        },
      );
    }
  } catch (error) {
    console.error("Unexpected error in flag proxy:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: CACHE_SCENARIOS.serverError(),
      },
    );
  }
}

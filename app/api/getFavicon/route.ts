import { NextRequest, NextResponse } from "next/server";
import validator from "validator";
import { z } from "zod";

const faviconRequestSchema = z.object({
  url: z
    .string()
    .min(1, { message: "URL parameter is required" })
    .refine(
      (val) => {
        const isValid = validator.isURL(val, {
          protocols: ["http", "https"],
          require_protocol: true,
          require_valid_protocol: true,
        });
        if (!isValid) {
          console.log("API: Invalid URL detected:", val);
          console.log("API: Validator result:", isValid);
        }

        return isValid;
      },
      {
        message: "Invalid URL format. Must be a valid HTTP or HTTPS URL.",
      },
    ),
});

const faviconResponseSchema = z.object({
  faviconUrl: z.string().url(),
  domain: z.string().min(1),
});

type FaviconResponse = z.infer<typeof faviconResponseSchema>;

/**
 * Optimized cache headers for Railway + Cloudflare setup
 * - Cloudflare-CDN-Cache-Control: Controls edge caching at Cloudflare (most specific, takes precedence)
 * - CDN-Cache-Control: Controls other CDNs downstream
 * - Cache-Control: Controls browser/client caching
 * - stale-while-revalidate: Serve stale content while fetching fresh data in background
 */
const getCacheHeaders = (isCacheable: boolean): Record<string, string> => {
  if (!isCacheable) {
    return {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Cloudflare-CDN-Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };
  }

  // For successful favicon responses - long-term caching
  return {
    // Browser/client cache for 30 days
    "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
    // Cloudflare edge cache for 60 days (stale-while-revalidate for 30 more days)
    "Cloudflare-CDN-Cache-Control":
      "public, max-age=5184000, stale-while-revalidate=2592000",
    // Other CDNs cache for 45 days
    "CDN-Cache-Control":
      "public, max-age=3888000, stale-while-revalidate=1728000",
    // Mark response as immutable since favicons rarely change
    Vary: "Accept-Encoding",
  };
};

/**
 * Cache headers for error responses - much shorter
 */
const getErrorCacheHeaders = (): Record<string, string> => {
  return {
    // Browser cache for 1 hour
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    // Cloudflare edge cache for 6 hours (allow stale for 24 hours)
    "Cloudflare-CDN-Cache-Control":
      "public, max-age=21600, stale-while-revalidate=86400",
    // Other CDNs cache for 3 hours
    "CDN-Cache-Control": "public, max-age=10800, stale-while-revalidate=86400",
    Vary: "Accept-Encoding",
  };
};

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const timestamp = new Date().toISOString();

  console.log(
    `[${requestId}] 🔥 CACHE MISS - Request hit origin server at ${timestamp}`,
  );
  console.log(`[${requestId}] Request URL: ${request.url}`);

  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    const validationResult = faviconRequestSchema.safeParse({ url });

    if (!validationResult.success) {
      const errorMessage =
        validationResult.error.errors[0]?.message || "Invalid request";
      console.log("API: Validation failed:", validationResult.error.errors);
      return NextResponse.json(
        { error: errorMessage },
        { status: 400, headers: getErrorCacheHeaders() },
      );
    }

    const { url: validatedUrl } = validationResult.data;

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(validatedUrl);
    } catch {
      return NextResponse.json(
        { error: "Could not parse URL" },
        { status: 400, headers: getErrorCacheHeaders() },
      );
    }

    const domain = parsedUrl.hostname;

    if (!domain) {
      return NextResponse.json(
        { error: "Could not extract domain from URL" },
        { status: 400, headers: getErrorCacheHeaders() },
      );
    }

    // Additional security: Validate domain format
    if (!validator.isFQDN(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400, headers: getErrorCacheHeaders() },
      );
    }

    // Security: Block private/localhost domains
    if (
      validator.isIP(domain) ||
      domain.includes("localhost") ||
      domain.includes("127.0.0.1")
    ) {
      return NextResponse.json(
        { error: "Private/localhost domains are not allowed" },
        { status: 400, headers: getErrorCacheHeaders() },
      );
    }

    // Security: Block potentially malicious domains
    const blockedPatterns = [
      /^0\.0\.0\.0$/,
      /^localhost$/,
      /^127\./,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
    ];

    if (blockedPatterns.some((pattern) => pattern.test(domain))) {
      return NextResponse.json(
        { error: "Domain not allowed" },
        { status: 400, headers: getErrorCacheHeaders() },
      );
    }

    const faviconUrl = `https://favicon.vemetric.com/${domain}?size=32`;

    try {
      const response = await fetch(faviconUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FaviconFetcher/1.0)",
        },
      });

      if (!response.ok) {
        console.log(
          `API: Favicon not accessible for domain: ${domain}, status: ${response.status}`,
        );
        throw new Error("Favicon not accessible");
      }
    } catch (error) {
      console.log(
        `[${requestId}] ❌ Error fetching favicon for domain: ${domain}`,
        error,
      );
      console.log(`[${requestId}] 📦 Sending 404 with error cache headers`);
      return NextResponse.json(
        { error: "Favicon not found or not accessible" },
        {
          status: 404,
          headers: getErrorCacheHeaders(),
        },
      );
    }

    console.log(
      `[${requestId}] ✅ Successfully fetched favicon for domain: ${domain}`,
    );

    const responseData: FaviconResponse = {
      faviconUrl,
      domain,
    };
    const responseValidation = faviconResponseSchema.safeParse(responseData);
    if (!responseValidation.success) {
      console.error(
        `[${requestId}] Response validation failed:`,
        responseValidation.error,
      );
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: getErrorCacheHeaders() },
      );
    }

    const cacheHeaders = getCacheHeaders(true);

    console.log(
      `[${requestId}] 📦 Sending response with optimized cache headers:`,
      cacheHeaders,
    );
    console.log(`[${requestId}] 💾 Response will be cached across all layers`);

    return NextResponse.json(responseData, {
      headers: cacheHeaders,
    });
  } catch (error) {
    console.error(`[${requestId}] 💥 Unexpected error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: getErrorCacheHeaders() },
    );
  }
}

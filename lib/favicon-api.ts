import { NextRequest, NextResponse } from "next/server";
import { getServerFileProxyOrigin } from "@/lib/config";
import { getFaviconRateLimit } from "@/lib/rateLimit";

const FAVICON_FETCH_TIMEOUT_MS = 8_000;

function readUrlParam(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url")?.trim();
  if (!urlParam) {
    return { error: "URL parameter is required" };
  }

  try {
    const parsedUrl = new URL(urlParam);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return { error: "URL must start with http:// or https://" };
    }
    return { urlParam };
  } catch {
    return { error: "URL is invalid" };
  }
}

export async function handleFaviconApiRequest(request: NextRequest) {
  const result = readUrlParam(request);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const clientIp =
    request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "anonymous";
  const rate = await getFaviconRateLimit().limit(`favicon:${clientIp}`);
  if (!rate.success) {
    return NextResponse.json(
      { error: "Too many favicon requests. Try again shortly." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const proxyUrl = new URL("/favicon", getServerFileProxyOrigin());
    proxyUrl.searchParams.set("url", result.urlParam);

    const response = await fetch(proxyUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(FAVICON_FETCH_TIMEOUT_MS),
    });
    const body = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";
    const cacheControl =
      response.status >= 500
        ? "no-store"
        : response.headers.get("cache-control") || "public, max-age=86400";

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Cache-Control": cacheControl,
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Favicon service is unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

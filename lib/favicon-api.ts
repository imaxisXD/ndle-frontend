import { NextRequest, NextResponse } from "next/server";

const DEFAULT_FILE_PROXY_URL =
  "https://proxy-file-worker-prod.sunny735084.workers.dev";

function getFileProxyUrl() {
  return process.env.NEXT_PUBLIC_FILE_PROXY_URL || DEFAULT_FILE_PROXY_URL;
}

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
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const proxyUrl = new URL("/favicon", getFileProxyUrl());
  proxyUrl.searchParams.set("url", result.urlParam);

  try {
    const response = await fetch(proxyUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const body = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Cache-Control":
          response.headers.get("cache-control") || "public, max-age=86400",
        "Content-Type": contentType,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Favicon service is unavailable" },
      { status: 503 },
    );
  }
}

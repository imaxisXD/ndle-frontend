import { NextRequest, NextResponse } from "next/server";

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
  "cache-control",
];

function log(message: string, ...rest: Array<unknown>) {
  console.log(`🧊 [ColdFileProxy] ${message}`, ...rest);
}

async function handleFileProxy(req: NextRequest) {
  const encodedUrl = req.nextUrl.searchParams.get("url");
  if (!encodedUrl) {
    log("Missing url parameter");
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let signedUrl = encodedUrl;
  try {
    signedUrl = decodeURIComponent(encodedUrl);
  } catch (err) {
    log("Failed to decode URL, proceeding with raw value", err);
  }

  const method = req.method;
  const incomingRange = req.headers.get("range");
  log(`Incoming ${method} request`, { range: incomingRange, preview: signedUrl.slice(0, 80) });

  const upstreamHeaders = new Headers();
  const isHead = method === "HEAD";
  if (incomingRange) {
    upstreamHeaders.set("range", incomingRange);
  } else if (isHead) {
    upstreamHeaders.set("range", "bytes=0-0");
  }

  try {
    const upstreamRes = await fetch(signedUrl, {
      method: "GET",
      headers: upstreamHeaders,
      redirect: "manual",
      cache: "no-store",
    });

    log("Upstream response", {
      status: upstreamRes.status,
      contentLength: upstreamRes.headers.get("content-length"),
      contentRange: upstreamRes.headers.get("content-range"),
    });

    const responseHeaders = new Headers();
    for (const header of FORWARDED_RESPONSE_HEADERS) {
      const value = upstreamRes.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    }

    if (isHead) {
      const contentRange = upstreamRes.headers.get("content-range");
      const contentLength = upstreamRes.headers.get("content-length");
      if (contentRange) {
        const [, total] = contentRange.split("/");
        if (total && total !== "*") {
          responseHeaders.set("content-length", total);
        }
      } else if (contentLength) {
        responseHeaders.set("content-length", contentLength);
      }

      return new NextResponse(null, {
        status: upstreamRes.ok ? 200 : upstreamRes.status,
        headers: responseHeaders,
      });
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (error) {
    log("Proxy fetch failed", error);
    return NextResponse.json({ error: "Proxy fetch failed" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return handleFileProxy(req);
}

export async function HEAD(req: NextRequest) {
  return handleFileProxy(req);
}

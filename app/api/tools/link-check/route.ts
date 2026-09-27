import { NextRequest, NextResponse } from "next/server";
import { LinkTargetError, checkLink, parseTarget } from "@/lib/link-check";
import { getLinkCheckRateLimit } from "@/lib/rateLimit";
import { turnstileSecretKey, verifyTurnstile } from "@/lib/turnstile";

/* The public link checker (app/tools/link-checker). Each request must come
   from this site, carry a fresh Turnstile token and stay under the per-network
   limit. Nothing about the checked link is stored. */

function json(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return json({ error: "This request must come from this website." }, 403);
  }
  const secret = turnstileSecretKey();
  if (!secret) {
    return json({ error: "The link checker isn't available right now." }, 503);
  }

  const body: unknown = await request.json().catch(() => ({}));
  const field = (name: string) =>
    typeof body === "object" && body !== null && name in body && typeof (body as Record<string, unknown>)[name] === "string"
      ? ((body as Record<string, unknown>)[name] as string)
      : "";

  let target: URL;
  try {
    target = parseTarget(field("url"));
  } catch (error) {
    return json({ error: error instanceof LinkTargetError ? error.message : "That link can't be checked." }, 400);
  }

  const clientIp = request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip");
  if (!(await verifyTurnstile(field("token"), clientIp, secret))) {
    return json({ error: "The security check didn't pass. Try it again.", code: "turnstile_failed" }, 403);
  }
  if (!(await getLinkCheckRateLimit().limit(`link-check:${clientIp || "anonymous"}`)).success) {
    return json({ error: "That's a lot of checks. Try again in an hour, or let ndle check your links for you." }, 429);
  }

  return json(await checkLink(target));
}

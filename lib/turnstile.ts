/* Cloudflare Turnstile, the check in front of the public link checker.

   Keys: NEXT_PUBLIC_TURNSTILE_SITE_KEY (public, in the page) and
   TURNSTILE_SECRET_KEY (a Worker secret). Development falls back to
   Cloudflare's published test keys, which always pass; production without
   keys fails closed, so the tool stays off rather than unguarded.
   https://developers.cloudflare.com/turnstile/troubleshooting/testing/ */

const TEST_SITE_KEY = "1x00000000000000000000AA";
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA";
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const isDev = process.env.NODE_ENV === "development";

export function turnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || (isDev ? TEST_SITE_KEY : "");
}

export function turnstileSecretKey(): string {
  return process.env.TURNSTILE_SECRET_KEY || (isDev ? TEST_SECRET_KEY : "");
}

/** Whether Cloudflare accepts the token. Tokens are single-use and last five minutes. */
export async function verifyTurnstile(
  token: string,
  remoteIp: string | null,
  secret: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await fetchImpl(SITEVERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}

/* One-off link checks for the public "Is this link working?" tool
   (app/tools/link-checker). The verdicts follow the monitor service's rules
   (ndle-link-monitoring/README.md, "Check results"), so the tool and ndle's
   30-minute checks agree about the same page:

   - HEAD first, then GET if HEAD answers 400, 403, 404, 405, 406 or 501.
   - Up to 10 redirects, each one validated before it's followed.
   - 2xx and 3xx at the end: working, or slow past 3 seconds.
   - 401, 403, 405, 406, 429 and 503: unclear. Usually bot protection or rate
     limiting, not an outage.
   - Everything else, failed connections and redirect loops: broken.

   Only public web addresses are checked. On Cloudflare Workers, outbound
   requests can't reach private networks; the address rules below also keep
   the local dev server from being pointed at itself or the LAN. */

export type LinkCheckVerdict = "working" | "slow" | "broken" | "unclear";

export type LinkCheckHop = { url: string; status: number; ms: number };

export type LinkCheckResult = {
  verdict: LinkCheckVerdict;
  /** The last address reached. */
  finalUrl: string;
  /** The last status code, or null when no answer came back. */
  status: number | null;
  /** A plain sentence when the request itself failed. */
  error?: string;
  hops: LinkCheckHop[];
  totalMs: number;
};

export const MAX_REDIRECTS = 10;
export const SLOW_MS = 3_000;
const HOP_TIMEOUT_MS = 8_000;
const GET_RETRY_STATUSES = new Set([400, 403, 404, 405, 406, 501]);
const UNCLEAR_STATUSES = new Set([401, 403, 405, 406, 429, 503]);
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];
const USER_AGENT = "ndle-link-checker/1.0 (+https://ndle.app/tools/link-checker)";

export class LinkTargetError extends Error {}

/** A public http(s) address, or a LinkTargetError saying why not. Accepts
    "example.com/page" and adds https://. */
export function parseTarget(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new LinkTargetError("Paste a link to check.");
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new LinkTargetError("That doesn't look like a web address.");
  }
  assertPublic(url);
  return url;
}

function assertPublic(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new LinkTargetError("Only http and https links can be checked.");
  }
  if (url.username || url.password) {
    throw new LinkTargetError("Links with a username or password in them can't be checked.");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new LinkTargetError("Links on unusual ports can't be checked.");
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith("[");
  if (
    !host.includes(".") ||
    host === "localhost" ||
    BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix)) ||
    // Public sites are reached by name; IP addresses are how private ones are reached.
    isIpLiteral
  ) {
    throw new LinkTargetError("Only public websites can be checked.");
  }
}

export function verdictFor(status: number, totalMs: number): LinkCheckVerdict {
  if (UNCLEAR_STATUSES.has(status)) return "unclear";
  if (status >= 200 && status < 400) return totalMs > SLOW_MS ? "slow" : "working";
  return "broken";
}

async function request(url: URL, method: "HEAD" | "GET", fetchImpl: typeof fetch) {
  const response = await fetchImpl(url, {
    method,
    redirect: "manual",
    headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
    signal: AbortSignal.timeout(HOP_TIMEOUT_MS),
  });
  // Only the headers matter; don't download the page.
  await response.body?.cancel().catch(() => {});
  return response;
}

function failureText(error: unknown) {
  if (error instanceof LinkTargetError) return error.message;
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    return "The site took too long to respond.";
  }
  return "Couldn't connect to the site. It may be down, or its security certificate may be invalid.";
}

export async function checkLink(target: URL, fetchImpl: typeof fetch = fetch): Promise<LinkCheckResult> {
  const started = Date.now();
  const hops: LinkCheckHop[] = [];
  let url = target;

  const done = (verdict: LinkCheckVerdict, status: number | null, error?: string): LinkCheckResult => ({
    verdict,
    finalUrl: url.href,
    status,
    ...(error ? { error } : {}),
    hops,
    totalMs: Date.now() - started,
  });

  for (let redirects = 0; ; redirects++) {
    const hopStarted = Date.now();
    let response: Response;
    try {
      response = await request(url, "HEAD", fetchImpl);
      if (GET_RETRY_STATUSES.has(response.status)) response = await request(url, "GET", fetchImpl);
    } catch (error) {
      return done("broken", null, failureText(error));
    }
    hops.push({ url: url.href, status: response.status, ms: Date.now() - hopStarted });

    const location = response.headers.get("location");
    if (response.status < 300 || response.status >= 400 || !location) {
      return done(verdictFor(response.status, Date.now() - started), response.status);
    }
    if (redirects === MAX_REDIRECTS) {
      return done("broken", response.status, "The link redirects too many times, so the page never loads.");
    }
    try {
      url = new URL(location, url);
      assertPublic(url);
    } catch (error) {
      return done(
        "broken",
        response.status,
        error instanceof LinkTargetError ? `It redirects to an address that can't be checked. ${error.message}` : "It redirects to an address that isn't valid.",
      );
    }
  }
}

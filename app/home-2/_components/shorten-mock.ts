import { ConvexError } from "convex/values";
import { makeShortLink } from "@/lib/config";
import type { MadeLink } from "./your-link-pages";

/* Development only: play the hero shortener's outcomes without a guest
   session or Convex, and without writing anything. Add `?mock=<kind>` to
   the home page's address, paste any link and press Shorten, e.g.
   http://localhost:3000/?mock=limit. hero-shortener.tsx loads this file
   only when NODE_ENV is "development", so production never ships it.

   Each failure is thrown the way production delivers it: the message
   redacted, the server's reason (copied from convex/) in a ConvexError's
   data. */

const REDACTED = "[CONVEX M(urlMainFuction:createGuestUrl)] [Request ID: 0000000000000000] Server Error\n  Called by client";

const REASONS = {
  duplicate: "You already have a short link for this destination. Copy it from your links list instead.",
  limit: "Guest mode allows up to 5 links each day.",
  network: "Guest links from your network reached today's limit of 10. Sign in to keep creating links.",
  paused: "Guest links are paused for now because of unusually high demand. Sign in to keep creating links, or try again later.",
  blocked: "For safety reasons, this domain has been blocked.",
  session: "Guest session is invalid",
  localhost: "Links to localhost are not supported.",
} as const;

export type MockKind = "success" | "slow" | "failed" | keyof typeof REASONS;

const LATENCY = 600; // ms, long enough to see "Shortening…"
const SLOW = 5000; // ms for `slow`: a success that keeps "Shortening…" up for a while
const GUEST_TTL = 7 * 24 * 60 * 60 * 1000; // guest links last 7 days (convex/ownership.ts)

export function isMockKind(value: string | null): value is MockKind {
  return value === "success" || value === "slow" || value === "failed" || (value !== null && value in REASONS);
}

export async function mockShorten(kind: MockKind): Promise<MadeLink> {
  await new Promise((resolve) => setTimeout(resolve, kind === "slow" ? SLOW : LATENCY));
  if (kind === "success" || kind === "slow") {
    // A fresh six-character slug each time, like the real ones
    const slug = Array.from({ length: 6 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    return { short: makeShortLink(slug), expiresAt: Date.now() + GUEST_TTL };
  }
  // A crash on the server: no reason reaches the browser
  if (kind === "failed") throw new Error(REDACTED);
  const error = new ConvexError(REDACTED);
  (error as { data: unknown }).data = REASONS[kind];
  throw error;
}

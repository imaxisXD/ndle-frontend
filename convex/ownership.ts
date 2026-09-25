import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";

export const GUEST_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const GUEST_LINKS_PER_DAY = 5;
export const DEFAULT_GUEST_LINKS_PER_NETWORK_PER_DAY = 10;
export const DEFAULT_GUEST_LINKS_PER_HOUR = 200;
// Limits are enforced by reading up to `limit` rows, so keep one transaction bounded.
const MAX_CONFIGURED_GUEST_LIMIT = 5_000;
export const FREE_ACTIVE_LINK_LIMIT = 100;
export const FREE_ANALYTICS_RANGE_DAYS = 30;

export type ViewerPlan = "guest" | "free" | "pro";

export function getViewerPlan(
  membership: string | null | undefined,
): ViewerPlan {
  if (membership?.trim().toLowerCase() === "pro") {
    return "pro";
  }
  if (membership) {
    return "free";
  }
  return "guest";
}

export function makeGuestOwnerKey(guestId: string) {
  return `guest:${guestId}`;
}

export function makeUserOwnerKey(userId: string) {
  return `user:${userId}`;
}

export function getCurrentOwnerKey(
  url: Pick<
    Doc<"urls">,
    "ownershipState" | "guestId" | "userTableId" | "analyticsOwnerKey"
  >,
) {
  if (url.ownershipState === "user" && url.userTableId) {
    return makeUserOwnerKey(url.userTableId);
  }
  if (url.ownershipState === "guest" && url.guestId) {
    return makeGuestOwnerKey(url.guestId);
  }
  if (url.analyticsOwnerKey) {
    return url.analyticsOwnerKey;
  }
  if (url.userTableId) {
    return makeUserOwnerKey(url.userTableId);
  }
  if (url.guestId) {
    return makeGuestOwnerKey(url.guestId);
  }
  throw new ConvexError("Link owner data is missing");
}

export function getOwnerSnapshot(
  url: Pick<
    Doc<"urls">,
    "ownershipState" | "guestId" | "userTableId" | "analyticsOwnerKey"
  >,
) {
  const analyticsOwnerKey = getCurrentOwnerKey(url);
  const userId =
    url.ownershipState === "guest" ? undefined : url.userTableId ?? undefined;
  const guestId =
    url.ownershipState === "guest" ? url.guestId : undefined;
  return {
    analyticsOwnerKey,
    userId,
    guestId,
  };
}

export function ensureGuestId(guestId: string | undefined) {
  const value = guestId?.trim();
  if (
    !value ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    throw new ConvexError("Guest session not found");
  }
  return value;
}

/** A whole number from the deployment environment; 0 stops guest creation entirely. */
function readGuestLimit(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  return Math.min(Number(raw), MAX_CONFIGURED_GUEST_LIMIT);
}

export function getGuestLinksPerNetworkPerDay() {
  return readGuestLimit(
    "GUEST_LINKS_PER_NETWORK_PER_DAY",
    DEFAULT_GUEST_LINKS_PER_NETWORK_PER_DAY,
  );
}

export function getGuestLinksPerHour() {
  return readGuestLimit("GUEST_LINKS_PER_HOUR", DEFAULT_GUEST_LINKS_PER_HOUR);
}

export function getGuestExpiry() {
  return Date.now() + GUEST_LINK_TTL_MS;
}

import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

export const GUEST_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const GUEST_LINKS_PER_DAY = 5;
export const FREE_ACTIVE_LINK_LIMIT = 100;
export const FREE_ANALYTICS_RANGE_DAYS = 30;

export type ViewerPlan = "guest" | "free" | "pro";

export function getViewerPlan(
  membership: string | null | undefined,
): ViewerPlan {
  if (membership === "pro") {
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
  if (!value) {
    throw new ConvexError("Guest session not found");
  }
  return value;
}

export function ensureUserOwnsUrl(
  userId: Id<"users">,
  url: Doc<"urls"> | null,
): Doc<"urls"> {
  if (!url || url.userTableId !== userId) {
    throw new ConvexError("You do not have access to this link");
  }
  return url;
}

export function getGuestExpiry() {
  return Date.now() + GUEST_LINK_TTL_MS;
}

export function getPlanLimits(plan: ViewerPlan) {
  if (plan === "pro") {
    return {
      activeLinkLimit: null,
      analyticsDays: null,
      canUsePaidOptions: true,
      canUseCustomLogoQr: true,
    };
  }

  if (plan === "free") {
    return {
      activeLinkLimit: FREE_ACTIVE_LINK_LIMIT,
      analyticsDays: FREE_ANALYTICS_RANGE_DAYS,
      canUsePaidOptions: false,
      canUseCustomLogoQr: false,
    };
  }

  return {
    activeLinkLimit: GUEST_LINKS_PER_DAY,
    analyticsDays: FREE_ANALYTICS_RANGE_DAYS,
    canUsePaidOptions: false,
    canUseCustomLogoQr: false,
  };
}

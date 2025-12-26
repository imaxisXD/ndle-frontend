/**
 * PostHog Analytics Utility
 *
 * All events are prefixed with 'ndle_' to differentiate in shared PostHog project.
 * This module provides typed functions for tracking user actions and identifying users.
 */
import posthog from "posthog-js";

// ============================================================================
// Event Name Constants
// ============================================================================

export const PostHogEvents = {
  // URL Lifecycle
  URL_CREATED: "ndle_url_created",
  URL_DELETED: "ndle_url_deleted",
  URL_COPIED: "ndle_url_copied",
  URL_QR_DOWNLOADED: "ndle_url_qr_downloaded",

  // Collections
  COLLECTION_CREATED: "ndle_collection_created",
  COLLECTION_DELETED: "ndle_collection_deleted",
  COLLECTION_URL_ADDED: "ndle_collection_url_added",

  // Feature Discovery
  ADVANCED_OPTIONS_OPENED: "ndle_advanced_options_opened",
  ANALYTICS_VIEWED: "ndle_analytics_viewed",
  SETTINGS_UPDATED: "ndle_settings_updated",

  // User Journey
  USER_SIGNED_UP: "ndle_user_signed_up",
  FIRST_URL_CREATED: "ndle_first_url_created",
} as const;

// ============================================================================
// Type Definitions
// ============================================================================

export type UrlCreatedProps = {
  slug_type: "random" | "human";
  has_expiration: boolean;
  has_utm: boolean;
  has_ab_test: boolean;
  has_password: boolean;
  has_qr_code: boolean;
  has_fallback: boolean;
  has_collection: boolean;
  has_targeting: boolean;
  has_social_metadata: boolean;
};

export type UserIdentifyProps = {
  convex_id: string;
  clerk_user_id: string;
  email?: string;
  name?: string;
  created_at?: number;
  total_urls?: number;
  total_collections?: number;
  plan?: string;
};

// ============================================================================
// URL Lifecycle Tracking
// ============================================================================

/**
 * Track when a user creates a new short URL
 */
export function trackUrlCreated(props: UrlCreatedProps) {
  posthog.capture(PostHogEvents.URL_CREATED, props);
}

/**
 * Track when a user deletes a URL
 */
export function trackUrlDeleted() {
  posthog.capture(PostHogEvents.URL_DELETED);
}

/**
 * Track when a user copies a URL to clipboard
 */
export function trackUrlCopied() {
  posthog.capture(PostHogEvents.URL_COPIED);
}

/**
 * Track when a user downloads a QR code
 */
export function trackQrDownloaded() {
  posthog.capture(PostHogEvents.URL_QR_DOWNLOADED);
}

// ============================================================================
// Collection Tracking
// ============================================================================

/**
 * Track when a user creates a new collection
 */
export function trackCollectionCreated() {
  posthog.capture(PostHogEvents.COLLECTION_CREATED);
}

/**
 * Track when a user deletes a collection
 */
export function trackCollectionDeleted() {
  posthog.capture(PostHogEvents.COLLECTION_DELETED);
}

/**
 * Track when a URL is added to a collection
 */
export function trackCollectionUrlAdded() {
  posthog.capture(PostHogEvents.COLLECTION_URL_ADDED);
}

// ============================================================================
// Feature Discovery Tracking
// ============================================================================

/**
 * Track when user opens the advanced options panel
 */
export function trackAdvancedOptionsOpened() {
  posthog.capture(PostHogEvents.ADVANCED_OPTIONS_OPENED);
}

/**
 * Track when user views the analytics dashboard
 */
export function trackAnalyticsViewed() {
  posthog.capture(PostHogEvents.ANALYTICS_VIEWED);
}

/**
 * Track when user updates a setting
 */
export function trackSettingsUpdated(setting: string) {
  posthog.capture(PostHogEvents.SETTINGS_UPDATED, { setting });
}

// ============================================================================
// User Journey Tracking
// ============================================================================

/**
 * Identify a user with their Clerk and Convex IDs plus additional properties.
 * Call this after successful authentication.
 */
export function identifyUser(clerkUserId: string, props: UserIdentifyProps) {
  posthog.identify(clerkUserId, props);
}

/**
 * Track when a new user creates their first URL (milestone event)
 */
export function trackFirstUrl() {
  posthog.capture(PostHogEvents.FIRST_URL_CREATED);
}

/**
 * Track when a user signs up
 */
export function trackSignup() {
  posthog.capture(PostHogEvents.USER_SIGNED_UP);
}

/**
 * Reset user identification (call on logout)
 */
export function resetUser() {
  posthog.reset();
}

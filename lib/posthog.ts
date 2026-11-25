import posthog from "posthog-js";

export const PostHogEvents = {
  URL_CREATED: "ndle_url_created",
  URL_DELETED: "ndle_url_deleted",
  URL_COPIED: "ndle_url_copied",
  COLLECTION_CREATED: "ndle_collection_created",
  COLLECTION_DELETED: "ndle_collection_deleted",
  COLLECTION_URL_ADDED: "ndle_collection_url_added",
  ADVANCED_OPTIONS_OPENED: "ndle_advanced_options_opened",
  ANALYTICS_VIEWED: "ndle_analytics_viewed",
} as const;

export type UrlCreatedProps = {
  slug_type: "random" | "human";
  has_expiration: boolean;
  has_utm: boolean;
  has_ab_test: boolean;
  has_qr_code: boolean;
  has_collection: boolean;
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

export function trackUrlCreated(props: UrlCreatedProps) {
  posthog.capture(PostHogEvents.URL_CREATED, props);
}

export function trackUrlDeleted() {
  posthog.capture(PostHogEvents.URL_DELETED);
}

export function trackUrlCopied() {
  posthog.capture(PostHogEvents.URL_COPIED);
}

export function trackCollectionCreated() {
  posthog.capture(PostHogEvents.COLLECTION_CREATED);
}

export function trackCollectionDeleted() {
  posthog.capture(PostHogEvents.COLLECTION_DELETED);
}

export function trackCollectionUrlAdded() {
  posthog.capture(PostHogEvents.COLLECTION_URL_ADDED);
}

export function trackAdvancedOptionsOpened() {
  posthog.capture(PostHogEvents.ADVANCED_OPTIONS_OPENED);
}

export function trackAnalyticsViewed() {
  posthog.capture(PostHogEvents.ANALYTICS_VIEWED);
}

export function identifyUser(clerkUserId: string, props: UserIdentifyProps) {
  posthog.identify(clerkUserId, props);
}

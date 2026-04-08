import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    membership: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
  guest_sessions: defineTable({
    guestId: v.string(),
    email: v.optional(v.string()),
    claimedUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
    claimedAt: v.optional(v.number()),
  })
    .index("by_guest_id", ["guestId"])
    .index("by_email", ["email"])
    .index("by_claimed_user", ["claimedUserId"]),
  urls: defineTable({
    fullurl: v.string(),
    shortUrl: v.string(),
    trackingEnabled: v.boolean(),
    expiresAt: v.optional(v.number()),
    qrEnabled: v.optional(v.boolean()),
    qrStyle: v.optional(
      v.object({
        fg: v.string(),
        bg: v.string(), // allow 'transparent' or hex
        margin: v.number(),
        logoMode: v.union(
          v.literal("brand"),
          v.literal("custom"),
          v.literal("none"),
        ),
        logoScale: v.number(),
        customLogoUrl: v.optional(v.string()),
      }),
    ),
    customDomain: v.optional(v.string()), // Custom domain for Pro users
    userTableId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    ownershipState: v.union(v.literal("guest"), v.literal("user")),
    analyticsOwnerKey: v.string(),
    claimedAt: v.optional(v.number()),
    slugAssigned: v.optional(v.string()),
    redisStatus: v.optional(v.string()),
    urlStatusMessage: v.optional(v.string()),
    // UTM Parameters
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),

    // A/B Testing
    abEnabled: v.optional(v.boolean()),
    abVariants: v.optional(
      v.array(
        v.object({
          url: v.string(),
          weight: v.number(),
        }),
      ),
    ),

    // Stable Link ID (for analytics correlation)
    linkId: v.optional(v.string()),
  })
    .index("by_slug", ["slugAssigned"])
    .index("by_user", ["userTableId"])
    .index("by_guest", ["guestId"])
    .index("by_fullurl", ["fullurl"])
    .index("by_user_url", ["userTableId", "fullurl"])
    .index("by_guest_url", ["guestId", "fullurl"])
    .index("by_user_slug", ["userTableId", "slugAssigned"])
    .index("by_guest_slug", ["guestId", "slugAssigned"])
    .index("by_owner_key", ["analyticsOwnerKey"]),
  urlAnalytics: defineTable({
    urlId: v.id("urls"),
    urlStatusCode: v.optional(v.number()),
    urlStatusMessage: v.optional(v.string()),
    updatedAt: v.number(),
    lastProcessedRequestId: v.optional(v.string()),
  }).index("by_url", ["urlId"]),
  linkHealthChecks: defineTable({
    urlId: v.id("urls"),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    analyticsOwnerKey: v.string(),
    shortUrl: v.string(),
    longUrl: v.string(),
    statusCode: v.number(),
    latencyMs: v.number(),
    isHealthy: v.boolean(),
    healthStatus: v.union(
      v.literal("up"),
      v.literal("down"),
      v.literal("degraded"),
    ),
    errorMessage: v.optional(v.string()),
    checkedAt: v.number(),
  })
    .index("by_url_id", ["urlId"])
    .index("by_user_id", ["userId"])
    .index("by_guest_id", ["guestId"])
    .index("by_url_and_time", ["urlId", "checkedAt"]),

  // Daily rollups for uptime % calculation (1 row per URL per day)
  linkHealthDailySummary: defineTable({
    urlId: v.id("urls"),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    analyticsOwnerKey: v.string(),
    date: v.string(), // "2024-12-13" format
    totalChecks: v.number(),
    healthyChecks: v.number(),
    avgLatencyMs: v.number(),
    incidentCount: v.number(),
  })
    .index("by_url_and_date", ["urlId", "date"])
    .index("by_user_and_date", ["userId", "date"])
    .index("by_guest_and_date", ["guestId", "date"])
    .index("by_url_id", ["urlId"]),

  // Individual incident events for "Recent Incidents" list
  linkIncidents: defineTable({
    urlId: v.id("urls"),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    analyticsOwnerKey: v.string(),
    shortUrl: v.string(),
    type: v.union(
      v.literal("error"),
      v.literal("warning"),
      v.literal("resolved"),
    ),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_user_recent", ["userId", "createdAt"])
    .index("by_guest_recent", ["guestId", "createdAt"])
    .index("by_url_id", ["urlId"]),
  collections: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userTableId: v.id("users"),
    urls: v.array(v.id("urls")),
    collectionColor: v.optional(v.string()),
    normalizedName: v.optional(v.string()),
    shareAble: v.optional(v.boolean()),
    shareUrl: v.optional(v.string()),
    shareExpiresAt: v.optional(v.number()),
    shareCreatedAt: v.optional(v.number()),
    shareUpdatedAt: v.optional(v.number()),
  })
    .index("by_urls", ["urls"])
    .index("by_user", ["userTableId"])
    .index("by_user_and_normalizedName", ["userTableId", "normalizedName"]),

  custom_domains: defineTable({
    userId: v.id("users"),
    domain: v.string(), // e.g., "links.example.com"
    status: v.union(
      v.literal("pending"), // Waiting for DNS verification
      v.literal("active"), // SSL issued, ready to use
      v.literal("failed"), // Verification failed
    ),
    cloudflareHostnameId: v.optional(v.string()), // Cloudflare custom hostname ID
    sslStatus: v.optional(v.string()), // pending_validation, active, etc.
    verificationTxtName: v.optional(v.string()), // TXT record name for verification
    verificationTxtValue: v.optional(v.string()), // TXT record value
    createdAt: v.number(),
    verifiedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_domain", ["domain"])
    .index("by_status", ["status"]),
  // UTM Templates for reusable UTM configurations
  utm_templates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
    usageCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  // Click events for real-time activity tracking
  clickEvents: defineTable({
    linkSlug: v.string(),
    urlId: v.optional(v.id("urls")),
    userId: v.optional(v.id("users")),
    guestId: v.optional(v.string()),
    analyticsOwnerKey: v.string(),
    occurredAt: v.number(),
    country: v.string(),
    city: v.optional(v.string()),
    deviceType: v.string(),
    browser: v.string(),
    os: v.string(),
    referer: v.optional(v.string()),
  })
    .index("by_link_slug", ["linkSlug", "occurredAt"])
    .index("by_user", ["userId", "occurredAt"])
    .index("by_guest", ["guestId", "occurredAt"])
    .index("by_url", ["urlId", "occurredAt"]),
});

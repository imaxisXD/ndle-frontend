import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    membership: v.string(),
    email: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
  urls: defineTable({
    fullurl: v.string(),
    shortUrl: v.string(),
    trackingEnabled: v.boolean(),
    expiresAt: v.optional(v.number()),
    userTableId: v.id("users"),
    slugAssigned: v.optional(v.string()),
    redisStatus: v.optional(v.string()),
    urlStatusMessage: v.optional(v.string()),
  })
    .index("by_slug", ["slugAssigned"])
    .index("by_user", ["userTableId"])
    .index("by_fullurl", ["fullurl"])
    .index("by_user_url", ["userTableId", "fullurl"])
    .index("by_user_slug", ["userTableId", "slugAssigned"]),
  urlAnalytics: defineTable({
    urlId: v.id("urls"),
    urlStatusCode: v.optional(v.number()),
    urlStatusMessage: v.optional(v.string()),
    updatedAt: v.number(),
    lastProcessedRequestId: v.optional(v.string()),
  }).index("by_url", ["urlId"]),
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
    .index("by_user", ["userTableId"])
    .index("by_user_and_normalizedName", ["userTableId", "normalizedName"]),
  analytics_cache: defineTable({
    cache_key: v.string(),
    response_data: v.any(),
    created_at: v.number(),
    ttl_seconds: v.number(),
    query_scope: v.string(),
    user_id: v.string(),
    refresh_status: v.optional(
      v.union(v.literal("idle"), v.literal("running")),
    ),
    refresh_lease_until: v.optional(v.number()),
  })
    .index("by_cache_key", ["cache_key"])
    .index("by_user_and_created", ["user_id", "created_at"])
    .index("by_created_at", ["created_at"]),
});

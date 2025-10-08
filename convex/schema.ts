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
    urlStatusCode: v.optional(v.number()),
    urlStatusMessage: v.optional(v.string()),
  })
    .index("by_slug", ["slugAssigned"])
    .index("by_user", ["userTableId"])
    .index("by_fullurl", ["fullurl"])
    .index("by_user_url", ["userTableId", "fullurl"]),
  urlAnalytics: defineTable({
    urlId: v.id("urls"),
    totalClickCounts: v.number(),
    updatedAt: v.number(),
  }).index("by_url", ["urlId"]),
});

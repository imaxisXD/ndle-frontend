import { v } from "convex/values";

export const serviceSyncTarget = v.union(
  v.object({ kind: v.literal("redirect"), urlId: v.id("urls"), slug: v.string() }),
  v.object({ kind: v.literal("monitor"), urlId: v.id("urls") }),
  v.object({ kind: v.literal("owner"), userId: v.id("users"), ownerKeys: v.array(v.string()) }),
  v.object({ kind: v.literal("clerk"), userId: v.id("users"), clerkUserId: v.string() }),
  v.object({ kind: v.literal("domain"), hostname: v.string(), domainId: v.optional(v.id("custom_domains")), hostnameId: v.optional(v.string()) }),
  v.object({ kind: v.literal("domain_lookup"), hostnameId: v.string() }),
);

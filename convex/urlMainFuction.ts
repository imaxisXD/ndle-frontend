import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { getCurrentUser } from "./users";
import { VALIDATION_ERRORS, createSlug, isValidHttpUrl } from "./utils";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

export const createUrl = mutation({
  args: {
    url: v.string(),
    slugType: v.union(v.literal("random"), v.literal("human")),
    trackingEnabled: v.boolean(),
    expiresAt: v.optional(v.number()),
  },
  returns: v.object({
    docId: v.id("urls"),
    slug: v.string(),
  }),
  async handler(ctx, args) {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const isValidUrl = isValidHttpUrl(args.url);
    if (!isValidUrl.valid) {
      const errorCopy: Record<
        (typeof VALIDATION_ERRORS)[keyof typeof VALIDATION_ERRORS],
        string
      > = {
        INVALID_FORMAT: isValidUrl.error ?? "We couldn’t process that link.",
        INVALID_PROTOCOL: isValidUrl.error ?? "Unsupported link protocol.",
        MISSING_HOST:
          isValidUrl.error ?? "Missing a valid website domain in the link.",
        LOCALHOST_NOT_ALLOWED:
          isValidUrl.error ?? "Links to localhost are not supported.",
        PRIVATE_IP_NOT_ALLOWED:
          isValidUrl.error ??
          "Links to private or internal network addresses are not supported.",
        SUSPICIOUS_PATTERN:
          isValidUrl.error ??
          "The link includes characters we can’t safely shorten.",
        URL_TOO_LONG:
          isValidUrl.error ?? "The link is longer than the supported length.",
        INVALID_PORT:
          isValidUrl.error ??
          "The port number in the link is outside the allowed range.",
        BLACKLISTED_DOMAIN:
          isValidUrl.error ??
          "For safety reasons, this domain has been blocked.",
        USERINFO_NOT_ALLOWED:
          isValidUrl.error ??
          "Links cannot contain embedded usernames or passwords.",
      };

      throw new ConvexError(errorCopy[isValidUrl.errorCode!]);
    }
    //checking if the url is already shortened by the user
    const existingUrl = await ctx.db
      .query("urls")
      .withIndex("by_user_url", (q) =>
        q.eq("userTableId", user._id).eq("fullurl", args.url),
      )
      .collect();
    console.log("existingUrl", existingUrl.length > 0);
    if (existingUrl.length > 0) {
      throw new ConvexError(
        "You already have a short link for this destination. Copy it from your links list instead.",
      );
    }

    // checking if the slug is already used if yes then re create slug using loop
    let slug: string, existingSlug: Doc<"urls"> | null;
    do {
      slug = createSlug(args.slugType);
      existingSlug = await ctx.db
        .query("urls")
        .withIndex("by_slug", (q) => q.eq("slugAssigned", slug))
        .unique();
    } while (existingSlug);

    const docId = await ctx.db.insert("urls", {
      fullurl: args.url,
      shortUrl: slug,
      trackingEnabled: args.trackingEnabled,
      expiresAt: args.expiresAt ?? undefined,
      userTableId: user._id,
      slugAssigned: slug,
      urlStatusMessage: "creating",
    });

    ctx.scheduler.runAfter(0, internal.redisAction.insertIntoRedis, {
      fullUrl: args.url,
      slugAssigned: slug,
      docId: docId,
    });

    return { docId, slug };
  },
});

export const updateUrlStatus = internalMutation({
  args: {
    docId: v.id("urls"),
    urlStatusMessage: v.string(),
    redisStatus: v.string(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    await ctx.db.patch(args.docId, {
      urlStatusMessage: args.urlStatusMessage,
      redisStatus: args.redisStatus,
    });
    return null;
  },
});

export const getUserUrls = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    return await ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .collect();
  },
});

import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  mutation,
  MutationCtx,
  query,
} from "./_generated/server";
import { getCurrentUser } from "./users";
import { VALIDATION_ERRORS, createSlug, isValidHttpUrl } from "./utils";
import { Doc } from "./_generated/dataModel";
import { internal, components, api } from "./_generated/api";
import { ShardedCounter } from "@convex-dev/sharded-counter";

const counter = new ShardedCounter(components.shardedCounter);

export const createUrl = mutation({
  args: {
    url: v.string(),
    slugType: v.union(v.literal("random"), v.literal("human")),
    trackingEnabled: v.boolean(),
    expiresAt: v.optional(v.number()),
    qrEnabled: v.optional(v.boolean()),
    qrStyle: v.optional(
      v.object({
        fg: v.string(),
        bg: v.string(),
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
    collectionId: v.optional(v.id("collections")),
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

    if (args.expiresAt !== undefined) {
      if (!Number.isFinite(args.expiresAt)) {
        throw new ConvexError("Invalid expiration");
      }
      if (args.expiresAt <= Date.now()) {
        throw new ConvexError("Expiration must be in the future");
      }
    }

    //checking if the url is already shortened by the user (scoped by domain)
    const existingUrls = await ctx.db
      .query("urls")
      .withIndex("by_user_url", (q) =>
        q.eq("userTableId", user._id).eq("fullurl", args.url),
      )
      .collect();

    // Check if URL already exists for this specific domain context
    const duplicateExists = existingUrls.some((url) => {
      if (args.customDomain) {
        // If creating with custom domain, check if same URL exists on that domain
        return url.customDomain === args.customDomain;
      } else {
        // If creating without custom domain, check if same URL exists without custom domain
        return !url.customDomain;
      }
    });

    if (duplicateExists) {
      const domainContext = args.customDomain
        ? `on ${args.customDomain}`
        : "on the default domain";
      throw new ConvexError(
        `You already have a short link for this destination ${domainContext}. Copy it from your links list instead.`,
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
      qrEnabled: args.qrEnabled ?? false,
      qrStyle: args.qrStyle ?? undefined,
      customDomain: args.customDomain ?? undefined,
      userTableId: user._id,
      slugAssigned: slug,
      urlStatusMessage: "creating",
      // UTM Parameters
      utmSource: args.utmSource ?? undefined,
      utmMedium: args.utmMedium ?? undefined,
      utmCampaign: args.utmCampaign ?? undefined,
      utmTerm: args.utmTerm ?? undefined,
      utmContent: args.utmContent ?? undefined,
    });

    await ctx.db.insert("urlAnalytics", {
      urlId: docId,
      updatedAt: Date.now(),
      urlStatusMessage: "no traffic",
      urlStatusCode: 0,
    });

    // Prepare A/B variants with IDs
    const abVariantsWithIds =
      args.abEnabled && args.abVariants?.length
        ? args.abVariants.map((v, idx) => ({
            id: `variant_${idx}`,
            url: v.url,
            weight: v.weight,
          }))
        : undefined;

    ctx.scheduler.runAfter(0, internal.redisAction.insertIntoRedis, {
      user_id: user._id,
      fullUrl: args.url,
      slugAssigned: slug,
      docId: docId,
      // UTM Parameters
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      utmTerm: args.utmTerm,
      utmContent: args.utmContent,
      // A/B Testing
      abEnabled: args.abEnabled,
      abVariants: abVariantsWithIds,
      abDistribution: "deterministic",
    });

    if (args.expiresAt !== undefined) {
      // Schedule the deletion of the url after the expiration time
      ctx.scheduler.runAt(args.expiresAt, api.urlMainFuction.deleteUrl, {
        urlSlug: slug,
      });
    }

    if (args.collectionId) {
      const collection = await ctx.db.get(args.collectionId);
      if (!collection || collection.userTableId !== user._id) {
        throw new ConvexError("Collection not found or access denied");
      }
      await ctx.db.patch(args.collectionId, {
        urls: [...collection.urls, docId],
      });
    }

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

export const getUserUrlsWithAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    const urls = await ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .order("desc")
      .collect();
    const urlsWithAnalytics = await Promise.all(
      urls.map(async (url) => {
        const analytics = await ctx.db
          .query("urlAnalytics")
          .withIndex("by_url", (q) => q.eq("urlId", url._id))
          .unique();
        const key = `url:${url._id}`;
        const totalClickCounts = await counter.count(ctx, key);
        const analyticsWithCount = analytics
          ? { ...analytics, totalClickCounts }
          : null;
        return { ...url, analytics: analyticsWithCount };
      }),
    );

    return urlsWithAnalytics;
  },
});

export const getUserUrlsWithAnalyticsByCollection = query({
  args: {
    collectionId: v.id("collections"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    // Get the collection to access its URLs array
    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userTableId !== user._id) {
      return null;
    }

    // Get URLs that are in the collection
    const urls = await Promise.all(
      collection.urls.map(async (urlId) => {
        const url = await ctx.db.get(urlId);
        return url;
      }),
    );

    // Filter out any null URLs and get analytics for each
    const validUrls = urls.filter((url): url is Doc<"urls"> => url !== null);
    const urlsWithAnalytics = await Promise.all(
      validUrls.map(async (url) => {
        const analytics = await ctx.db
          .query("urlAnalytics")
          .withIndex("by_url", (q) => q.eq("urlId", url._id))
          .unique();
        const key = `url:${url._id}`;
        const totalClickCounts = await counter.count(ctx, key);
        const analyticsWithCount = analytics
          ? { ...analytics, totalClickCounts }
          : null;
        return { ...url, analytics: analyticsWithCount };
      }),
    );

    return urlsWithAnalytics;
  },
});

export const deleteUrl = mutation({
  args: {
    urlSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User not found");
    }
    const { url, isOwner } = await isUrlOwner(ctx, user, args.urlSlug);
    if (!isOwner || !url) {
      throw new ConvexError("You are not the owner of this url");
    }

    await ctx.scheduler.runAfter(0, internal.redisAction.deleteFromRedis, {
      slugAssigned: args.urlSlug,
    });

    //delete the analytics
    const analytics = await ctx.db
      .query("urlAnalytics")
      .withIndex("by_url", (q) => q.eq("urlId", url._id))
      .unique();

    if (analytics) {
      await ctx.db.delete(analytics._id);
    }

    await ctx.db.delete(url._id);
  },
});

/**
 * Helper function to check if the user is the owner of the url
 * @param ctx - The context object
 * @param urlSlug - The slug of the url
 * @returns True if the user is the owner of the url, false otherwise
 */
export const isUrlOwner = async (
  ctx: MutationCtx,
  user: Doc<"users">,
  urlSlug: string,
) => {
  const url = await ctx.db
    .query("urls")
    .withIndex("by_user_slug", (q) =>
      q.eq("userTableId", user._id).eq("slugAssigned", urlSlug),
    )
    .unique();

  if (!url) {
    return {
      url: null,
      isOwner: false,
    };
  }
  return {
    url,
    isOwner: url.userTableId === user._id,
  };
};

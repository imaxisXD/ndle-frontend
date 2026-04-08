import { ShardedCounter } from "@convex-dev/sharded-counter";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { api, components, internal } from "./_generated/api";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { upsertGuestSession } from "./guestSessions";
import {
  ensureGuestId,
  FREE_ACTIVE_LINK_LIMIT,
  GUEST_LINKS_PER_DAY,
  getGuestExpiry,
  getViewerPlan,
  makeGuestOwnerKey,
  makeUserOwnerKey,
} from "./ownership";
import { getCurrentUser } from "./users";
import { createSlug, isValidHttpUrl, VALIDATION_ERRORS } from "./utils";

const counter = new ShardedCounter(components.shardedCounter);

const errorCopyByCode: Record<string, string> = {
  [VALIDATION_ERRORS.INVALID_FORMAT]: "We couldn’t process that link.",
  [VALIDATION_ERRORS.INVALID_PROTOCOL]: "Unsupported link protocol.",
  [VALIDATION_ERRORS.MISSING_HOST]:
    "Missing a valid website domain in the link.",
  [VALIDATION_ERRORS.LOCALHOST_NOT_ALLOWED]:
    "Links to localhost are not supported.",
  [VALIDATION_ERRORS.PRIVATE_IP_NOT_ALLOWED]:
    "Links to private or internal network addresses are not supported.",
  [VALIDATION_ERRORS.SUSPICIOUS_PATTERN]:
    "The link includes characters we can’t safely shorten.",
  [VALIDATION_ERRORS.URL_TOO_LONG]:
    "The link is longer than the supported length.",
  [VALIDATION_ERRORS.INVALID_PORT]:
    "The port number in the link is outside the allowed range.",
  [VALIDATION_ERRORS.BLACKLISTED_DOMAIN]:
    "For safety reasons, this domain has been blocked.",
  [VALIDATION_ERRORS.USERINFO_NOT_ALLOWED]:
    "Links cannot contain embedded usernames or passwords.",
  [VALIDATION_ERRORS.SELF_DOMAIN_NOT_ALLOWED]:
    "You cannot create a redirect to ndle's own domains.",
};

type SignedInCreateArgs = {
  url: string;
  slugType: "random" | "human";
  trackingEnabled: boolean;
  expiresAt?: number;
  qrEnabled?: boolean;
  qrStyle?: {
    fg: string;
    bg: string;
    margin: number;
    logoMode: "brand" | "custom" | "none";
    logoScale: number;
    customLogoUrl?: string;
  };
  customDomain?: string;
  collectionId?: Id<"collections">;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  abEnabled?: boolean;
  abVariants?: Array<{
    url: string;
    weight: number;
  }>;
};

function normalizeDestination(url: string) {
  const normalized = url.trim();
  const validation = isValidHttpUrl(normalized);
  if (!validation.valid) {
    throw new ConvexError(
      errorCopyByCode[validation.errorCode ?? ""] ??
        validation.error ??
        "We couldn’t process that link.",
    );
  }
  return normalized;
}

function validateExpiration(expiresAt: number | undefined) {
  if (expiresAt === undefined) {
    return;
  }
  if (!Number.isFinite(expiresAt)) {
    throw new ConvexError("Invalid expiration");
  }
  if (expiresAt <= Date.now()) {
    throw new ConvexError("Expiration must be in the future");
  }
}

function validateSignedInPlan(user: Doc<"users">, args: SignedInCreateArgs) {
  const plan = getViewerPlan(user.membership);
  if (plan === "pro") {
    return;
  }

  if (args.slugType === "human") {
    throw new ConvexError("Readable words are part of the Pro plan.");
  }

  if (args.qrStyle?.logoMode === "custom") {
    throw new ConvexError("Custom QR logos are part of the Pro plan.");
  }

  if (args.abEnabled || args.abVariants?.length) {
    throw new ConvexError("A/B testing is part of the Pro plan.");
  }

  if (args.expiresAt) {
    const activeDaysAhead = args.expiresAt
      ? Math.ceil((args.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
      : 0;
    if (activeDaysAhead > 30) {
      throw new ConvexError("Free plan links can expire up to 30 days ahead.");
    }
  }
}

async function ensureBelowUserLimit(ctx: MutationCtx, user: Doc<"users">) {
  if (getViewerPlan(user.membership) === "pro") {
    return;
  }

  const activeUrls = await ctx.db
    .query("urls")
    .withIndex("by_user", (q) => q.eq("userTableId", user._id))
    .collect();

  if (activeUrls.length >= FREE_ACTIVE_LINK_LIMIT) {
    throw new ConvexError(
      `Free plan supports up to ${FREE_ACTIVE_LINK_LIMIT} active links.`,
    );
  }
}

async function ensureBelowGuestLimit(ctx: MutationCtx, guestId: string) {
  const guestUrls = await ctx.db
    .query("urls")
    .withIndex("by_guest", (q) => q.eq("guestId", guestId))
    .collect();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentCount = guestUrls.filter((url) => url._creationTime >= oneDayAgo)
    .length;

  if (recentCount >= GUEST_LINKS_PER_DAY) {
    throw new ConvexError(
      `Guest mode allows up to ${GUEST_LINKS_PER_DAY} links each day.`,
    );
  }
}

async function ensureNoDuplicateForOwner(
  ctx: MutationCtx,
  args: {
    userId?: Id<"users">;
    guestId?: string;
    url: string;
    customDomain?: string;
  },
) {
  const existingUrls = args.userId
    ? await ctx.db
        .query("urls")
        .withIndex("by_user_url", (q) =>
          q.eq("userTableId", args.userId!).eq("fullurl", args.url),
        )
        .collect()
    : await ctx.db
        .query("urls")
        .withIndex("by_guest_url", (q) =>
          q.eq("guestId", args.guestId!).eq("fullurl", args.url),
        )
        .collect();

  const duplicateExists = existingUrls.some((url) =>
    args.customDomain ? url.customDomain === args.customDomain : !url.customDomain,
  );

  if (duplicateExists) {
    throw new ConvexError(
      "You already have a short link for this destination. Copy it from your links list instead.",
    );
  }
}

async function createUniqueSlug(ctx: MutationCtx, slugType: "random" | "human") {
  let slug: string;
  let existingSlug: Doc<"urls"> | null;
  do {
    slug = createSlug(slugType);
    existingSlug = await ctx.db
      .query("urls")
      .withIndex("by_slug", (q) => q.eq("slugAssigned", slug))
      .unique();
  } while (existingSlug);

  return slug;
}

async function syncUrlToRedis(
  ctx: MutationCtx,
  args: {
    docId: Id<"urls">;
    slugAssigned: string;
    fullUrl: string;
    analyticsOwnerKey: string;
    convexUserId?: Id<"users">;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmTerm?: string;
    utmContent?: string;
    abEnabled?: boolean;
    abVariants?: Array<{
      id: string;
      url: string;
      weight: number;
    }>;
    overwrite?: boolean;
  },
) {
  await ctx.scheduler.runAfter(0, internal.redisAction.insertIntoRedis, {
    docId: args.docId,
    fullUrl: args.fullUrl,
    slugAssigned: args.slugAssigned,
    analytics_owner_key: args.analyticsOwnerKey,
    convex_user_id: args.convexUserId,
    utmSource: args.utmSource,
    utmMedium: args.utmMedium,
    utmCampaign: args.utmCampaign,
    utmTerm: args.utmTerm,
    utmContent: args.utmContent,
    abEnabled: args.abEnabled,
    abVariants: args.abVariants,
    abDistribution: "deterministic",
    overwrite: args.overwrite,
  });
}

async function deleteUrlRecord(ctx: MutationCtx, url: Doc<"urls">) {
  await ctx.scheduler.runAfter(0, internal.redisAction.deleteFromRedis, {
    slugAssigned: url.slugAssigned ?? url.shortUrl,
  });

  const analytics = await ctx.db
    .query("urlAnalytics")
    .withIndex("by_url", (q) => q.eq("urlId", url._id))
    .unique();

  if (analytics) {
    await ctx.db.delete(analytics._id);
  }

  await ctx.db.delete(url._id);
}

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
    customDomain: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
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

    validateSignedInPlan(user, args);
    validateExpiration(args.expiresAt);
    await ensureBelowUserLimit(ctx, user);

    const normalizedUrl = normalizeDestination(args.url);
    await ensureNoDuplicateForOwner(ctx, {
      userId: user._id,
      url: normalizedUrl,
      customDomain: args.customDomain,
    });

    const slug = await createUniqueSlug(ctx, args.slugType);
    const ownerKey = makeUserOwnerKey(user._id);
    const abVariantsWithIds =
      args.abEnabled && args.abVariants?.length
        ? args.abVariants.map((variant, index) => ({
            id: `variant_${index}`,
            url: variant.url,
            weight: variant.weight,
          }))
        : undefined;

    const docId = await ctx.db.insert("urls", {
      fullurl: normalizedUrl,
      shortUrl: slug,
      trackingEnabled: args.trackingEnabled,
      expiresAt: args.expiresAt,
      qrEnabled: args.qrEnabled ?? false,
      qrStyle: args.qrStyle,
      customDomain: args.customDomain,
      userTableId: user._id,
      guestId: undefined,
      ownershipState: "user",
      analyticsOwnerKey: ownerKey,
      claimedAt: undefined,
      slugAssigned: slug,
      redisStatus: undefined,
      urlStatusMessage: "creating",
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      utmTerm: args.utmTerm,
      utmContent: args.utmContent,
      abEnabled: args.abEnabled,
      abVariants: args.abVariants,
    });

    await ctx.db.insert("urlAnalytics", {
      urlId: docId,
      updatedAt: Date.now(),
      urlStatusMessage: "no traffic",
      urlStatusCode: 0,
    });

    await syncUrlToRedis(ctx, {
      docId,
      slugAssigned: slug,
      fullUrl: normalizedUrl,
      analyticsOwnerKey: ownerKey,
      convexUserId: user._id,
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      utmTerm: args.utmTerm,
      utmContent: args.utmContent,
      abEnabled: args.abEnabled,
      abVariants: abVariantsWithIds,
    });

    if (args.expiresAt !== undefined) {
      await ctx.scheduler.runAt(args.expiresAt, internal.urlMainFuction.deleteUrlById, {
        urlId: docId,
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

    await ctx.scheduler.runAfter(
      0,
      internal.linkHealth.registerUrlWithMonitoringService,
      {
        convexUrlId: docId,
        convexUserId: user._id,
        longUrl: normalizedUrl,
        shortUrl: slug,
      },
    );

    return { docId, slug };
  },
});

export const createGuestUrl = mutation({
  args: {
    url: v.string(),
    guestId: v.string(),
    guestEmail: v.optional(v.string()),
  },
  returns: v.object({
    docId: v.id("urls"),
    slug: v.string(),
    expiresAt: v.number(),
  }),
  async handler(ctx, args) {
    const guestId = ensureGuestId(args.guestId);
    const normalizedUrl = normalizeDestination(args.url);
    await ensureBelowGuestLimit(ctx, guestId);
    await ensureNoDuplicateForOwner(ctx, {
      guestId,
      url: normalizedUrl,
    });

    await upsertGuestSession(ctx, guestId, args.guestEmail);

    const slug = await createUniqueSlug(ctx, "random");
    const expiresAt = getGuestExpiry();
    const ownerKey = makeGuestOwnerKey(guestId);

    const docId = await ctx.db.insert("urls", {
      fullurl: normalizedUrl,
      shortUrl: slug,
      trackingEnabled: true,
      expiresAt,
      qrEnabled: false,
      qrStyle: undefined,
      customDomain: undefined,
      userTableId: undefined,
      guestId,
      ownershipState: "guest",
      analyticsOwnerKey: ownerKey,
      claimedAt: undefined,
      slugAssigned: slug,
      redisStatus: undefined,
      urlStatusMessage: "creating",
      utmSource: undefined,
      utmMedium: undefined,
      utmCampaign: undefined,
      utmTerm: undefined,
      utmContent: undefined,
      abEnabled: false,
      abVariants: undefined,
    });

    await ctx.db.insert("urlAnalytics", {
      urlId: docId,
      updatedAt: Date.now(),
      urlStatusMessage: "no traffic",
      urlStatusCode: 0,
    });

    await syncUrlToRedis(ctx, {
      docId,
      slugAssigned: slug,
      fullUrl: normalizedUrl,
      analyticsOwnerKey: ownerKey,
    });

    await ctx.scheduler.runAt(expiresAt, internal.urlMainFuction.deleteUrlById, {
      urlId: docId,
    });

    return { docId, slug, expiresAt };
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

export const deleteUrlById = internalMutation({
  args: {
    urlId: v.id("urls"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const url = await ctx.db.get(args.urlId);
    if (!url) {
      return null;
    }
    await deleteUrlRecord(ctx, url);
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
    return await Promise.all(
      urls.map(async (url) => {
        const analytics = await ctx.db
          .query("urlAnalytics")
          .withIndex("by_url", (q) => q.eq("urlId", url._id))
          .unique();
        const totalClickCounts = await counter.count(ctx, `url:${url._id}`);
        return {
          ...url,
          analytics: analytics ? { ...analytics, totalClickCounts } : null,
        };
      }),
    );
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

    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userTableId !== user._id) {
      return null;
    }

    const urls = await Promise.all(collection.urls.map((urlId) => ctx.db.get(urlId)));
    const validUrls = urls.filter((url): url is Doc<"urls"> => url !== null);

    return await Promise.all(
      validUrls.map(async (url) => {
        const analytics = await ctx.db
          .query("urlAnalytics")
          .withIndex("by_url", (q) => q.eq("urlId", url._id))
          .unique();
        const totalClickCounts = await counter.count(ctx, `url:${url._id}`);
        return {
          ...url,
          analytics: analytics ? { ...analytics, totalClickCounts } : null,
        };
      }),
    );
  },
});

export const deleteUrl = mutation({
  args: {
    urlSlug: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User not found");
    }
    const { url, isOwner } = await isUrlOwner(ctx, user, args.urlSlug);
    if (!isOwner || !url) {
      throw new ConvexError("You are not the owner of this link");
    }

    await deleteUrlRecord(ctx, url);
    return null;
  },
});

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
    return { url: null, isOwner: false };
  }

  return {
    url,
    isOwner: url.userTableId === user._id,
  };
};

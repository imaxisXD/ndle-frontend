import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { counter } from "./urlAnalytics";

export const getCollectionById = query({
  args: {
    collectionId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }
    const collectionNormaliseId = ctx.db.normalizeId(
      "collections",
      args.collectionId,
    );
    if (!collectionNormaliseId) {
      return null;
    }
    const collection = await ctx.db.get(collectionNormaliseId);
    if (!collection || collection.userTableId !== user._id) {
      return null;
    }

    return collection;
  },
});

export const getUserUrlsNotInCollection = query({
  args: {
    collectionId: v.id("collections"),
  },
  returns: v.array(
    v.object({
      _id: v.id("urls"),
      fullurl: v.string(),
      shortUrl: v.string(),
      slugAssigned: v.optional(v.string()),
      _creationTime: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userTableId !== user._id) {
      return [];
    }

    // Get all user URLs
    const allUrls = await ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .order("desc")
      .collect();

    // Filter out URLs that are already in the collection
    const urlsNotInCollection = allUrls.filter(
      (url) => !collection.urls.includes(url._id),
    );

    return urlsNotInCollection.map((url) => ({
      _id: url._id,
      fullurl: url.fullurl,
      shortUrl: url.shortUrl,
      slugAssigned: url.slugAssigned,
      _creationTime: url._creationTime,
    }));
  },
});

export const addUrlToCollection = mutation({
  args: {
    collectionId: v.id("collections"),
    urlId: v.id("urls"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }

    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userTableId !== user._id) {
      throw new Error("Collection not found or access denied");
    }

    const url = await ctx.db.get(args.urlId);
    if (!url || url.userTableId !== user._id) {
      throw new Error("URL not found or access denied");
    }

    // Check if URL is already in the collection
    if (collection.urls.includes(args.urlId)) {
      throw new Error("URL is already in this collection");
    }

    // Add URL to collection
    await ctx.db.patch(args.collectionId, {
      urls: [...collection.urls, args.urlId],
    });

    const currentUrlClicks = await counter.count(ctx, `url:${args.urlId}`);
    if (currentUrlClicks > 0) {
      await counter.add(
        ctx,
        `collection:${args.collectionId}`,
        currentUrlClicks,
      );
    }

    return null;
  },
});

export const getUserCollections = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .collect();

    if (collections.length === 0) {
      return [];
    }

    const collectionsWithClickCount = await Promise.all(
      collections.map(async (collection) => {
        let totalClickCount = 0;
        totalClickCount = await counter.count(
          ctx,
          `collection:${collection._id}`,
        );

        return {
          userTableId: collection.userTableId,
          id: collection._id,
          name: collection.name,
          description: collection.description,
          urlCount: collection.urls.length,
          collectionColor: collection.collectionColor,
          //   shareAble: collection.shareAble,
          //   shareUrl: collection.shareUrl,
          //   shareExpiresAt: collection.shareExpiresAt,
          //   shareCreatedAt: collection.shareCreatedAt,
          //   shareUpdatedAt: collection.shareUpdatedAt,
          creationTime: collection._creationTime,
          totalClickCount: totalClickCount,
        };
      }),
    );

    return collectionsWithClickCount;
  },
});

export const createCollection = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    collectionColor: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("User not found");
    }
    const normalizedName = args.name.trim().toLowerCase();

    const duplicate = await ctx.db
      .query("collections")
      .withIndex("by_user_and_normalizedName", (q) =>
        q.eq("userTableId", user._id).eq("normalizedName", normalizedName),
      )
      .first();

    if (duplicate) {
      throw new Error("You already have that collection");
    }

    return await ctx.db.insert("collections", {
      name: args.name,
      description: args.description || "",
      userTableId: user._id,
      urls: [],
      collectionColor: args.collectionColor,
      normalizedName,
      shareAble: false,
      shareUrl: undefined,
      shareExpiresAt: undefined,
      shareCreatedAt: undefined,
      shareUpdatedAt: undefined,
    });
  },
});

export const deleteCollection = mutation({
  args: {
    collectionId: v.id("collections"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const collection = await ctx.db.get(args.collectionId);
    if (!collection || collection.userTableId !== user._id) {
      throw new ConvexError("Collection not found or access denied");
    }

    await ctx.db.delete(args.collectionId);
    return null;
  },
});

import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  mutation,
  query,
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { accountCounter as counter } from "./accountCounters";
import schema from "./schema";

const BATCH_SIZE = 100;
const collectionDocument = v.object({
  _id: v.id("collections"),
  _creationTime: v.number(),
  ...schema.tables.collections.validator.fields,
});
const collectionSummary = v.object({
  userTableId: v.id("users"),
  id: v.id("collections"),
  name: v.string(),
  description: v.optional(v.string()),
  urlCount: v.number(),
  collectionColor: v.optional(v.string()),
  creationTime: v.number(),
  totalClickCount: v.union(v.number(), v.null()),
  isUpdating: v.boolean(),
});
const pickerRow = v.object({
  _id: v.id("urls"),
  fullurl: v.string(),
  shortUrl: v.string(),
  slugAssigned: v.optional(v.string()),
  _creationTime: v.number(),
});

async function includeMember(
  ctx: MutationCtx,
  collection: Doc<"collections">,
  url: Doc<"urls">,
) {
  const existing = await ctx.db
    .query("collectionLinks")
    .withIndex("by_collectionId_and_urlId", (q) =>
      q.eq("collectionId", collection._id).eq("urlId", url._id),
    )
    .unique();
  if (existing?.clicksIncluded) return false;
  const countedClicks = await counter.count(ctx, `url:${url._id}`);
  if (!existing)
    await ctx.db.insert("collectionLinks", {
      collectionId: collection._id,
      urlId: url._id,
      userId: collection.userTableId,
      clicksIncluded: true,
      countedClicks,
    });
  else
    await ctx.db.patch(existing._id, { clicksIncluded: true, countedClicks });
  await counter.add(ctx, `collection-v2:${collection._id}`, countedClicks);
  const current = await ctx.db.get(collection._id);
  await ctx.db.patch(collection._id, {
    linkCount: (current?.linkCount ?? 0) + 1,
  });
  return true;
}

export async function addLinkToCollection(
  ctx: MutationCtx,
  collectionId: Id<"collections">,
  urlId: Id<"urls">,
) {
  const collection = await ctx.db.get(collectionId);
  const url = await ctx.db.get(urlId);
  if (!collection || !url || collection.userTableId !== url.userTableId)
    throw new ConvexError("Collection or link not found");
  await includeMember(ctx, collection, url);
  if (!collection.membersReady)
    await ctx.scheduler.runAfter(
      0,
      internal.collectionMangament.migrateCollectionMembers,
      {},
    );
}

export async function incrementCollectionClicks(
  ctx: MutationCtx,
  urlId: Id<"urls">,
) {
  const newest = await ctx.db
    .query("collectionLinks")
    .withIndex("by_urlId", (q) => q.eq("urlId", urlId))
    .order("desc")
    .first();
  if (!newest) return;
  await incrementClickBatch(ctx, urlId, newest._creationTime, null);
}

async function incrementClickBatch(
  ctx: MutationCtx,
  urlId: Id<"urls">,
  lastMemberTime: number,
  cursor: string | null,
) {
  if (!(await ctx.db.get(urlId))) return;
  const result = await ctx.db
    .query("collectionLinks")
    .withIndex("by_urlId", (q) =>
      q.eq("urlId", urlId).lte("_creationTime", lastMemberTime),
    )
    .paginate({ cursor, numItems: BATCH_SIZE });
  for (const member of result.page) {
    if (member.clicksIncluded && (await ctx.db.get(member.collectionId))) {
      await counter.inc(ctx, `collection-v2:${member.collectionId}`);
      await ctx.db.patch(member._id, {
        countedClicks: (member.countedClicks ?? 0) + 1,
      });
    }
  }
  if (!result.isDone)
    await ctx.scheduler.runAfter(
      0,
      internal.collectionMangament.continueCollectionClick,
      { urlId, lastMemberTime, cursor: result.continueCursor },
    );
}

export const continueCollectionClick = internalMutation({
  args: { urlId: v.id("urls"), lastMemberTime: v.number(), cursor: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await incrementClickBatch(
      ctx,
      args.urlId,
      args.lastMemberTime,
      args.cursor,
    );
    return null;
  },
});

export async function removeLinkFromCollections(
  ctx: MutationCtx,
  urlId: Id<"urls">,
) {
  const members = await ctx.db
    .query("collectionLinks")
    .withIndex("by_urlId", (q) => q.eq("urlId", urlId))
    .take(BATCH_SIZE);
  for (const member of members) {
    const collection = await ctx.db.get(member.collectionId);
    if (collection && member.clicksIncluded) {
      await counter.add(
        ctx,
        `collection-v2:${collection._id}`,
        -(member.countedClicks ?? 0),
      );
      await ctx.db.patch(collection._id, {
        linkCount: Math.max(0, (collection.linkCount ?? 0) - 1),
      });
    }
    await ctx.db.delete(member._id);
  }
  if (members.length === BATCH_SIZE)
    await ctx.scheduler.runAfter(
      0,
      internal.collectionMangament.continueLinkRemoval,
      { urlId },
    );
}
export const continueLinkRemoval = internalMutation({
  args: { urlId: v.id("urls") },
  returns: v.null(),
  handler: async (ctx, { urlId }) => {
    await removeLinkFromCollections(ctx, urlId);
    return null;
  },
});

export const migrateCollectionMembers = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const collection = await ctx.db
      .query("collections")
      .withIndex("by_membersReady", (q) => q.eq("membersReady", undefined))
      .first();
    if (!collection) return null;
    const start = collection.memberMigrationOffset ?? 0;
    for (const urlId of collection.urls.slice(start, start + BATCH_SIZE)) {
      const url = await ctx.db.get(urlId);
      if (url?.userTableId === collection.userTableId)
        await includeMember(ctx, collection, url);
    }
    const done = start + BATCH_SIZE >= collection.urls.length;
    await ctx.db.patch(collection._id, {
      memberMigrationOffset: done ? undefined : start + BATCH_SIZE,
      membersReady: done ? true : undefined,
      ...(done ? { urls: [] } : {}),
    });
    await ctx.scheduler.runAfter(
      0,
      internal.collectionMangament.migrateCollectionMembers,
      {},
    );
    return null;
  },
});

export const getCollectionById = query({
  args: { collectionId: v.string() },
  returns: v.union(collectionDocument, v.null()),
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    const id = ctx.db.normalizeId("collections", collectionId);
    if (!id) return null;
    const collection = await ctx.db.get(id);
    return collection?.userTableId === user._id ? collection : null;
  },
});

async function summarize(ctx: QueryCtx, collections: Doc<"collections">[]) {
  return Promise.all(
    collections.map(async (collection) => ({
      userTableId: collection.userTableId,
      id: collection._id,
      name: collection.name,
      description: collection.description,
      urlCount: collection.membersReady
        ? (collection.linkCount ?? 0)
        : collection.urls.length,
      collectionColor: collection.collectionColor,
      creationTime: collection._creationTime,
      totalClickCount: collection.membersReady
        ? await counter.count(ctx, `collection-v2:${collection._id}`)
        : null,
      isUpdating: !collection.membersReady,
    })),
  );
}

export const getUserCollections = query({
  args: {},
  returns: v.array(collectionSummary),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];
    return summarize(
      ctx,
      await ctx.db
        .query("collections")
        .withIndex("by_user", (q) => q.eq("userTableId", user._id))
        .order("desc")
        .take(100),
    );
  },
});
export const getCollectionsPage = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(collectionSummary),
    continueCursor: v.string(),
    isDone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], continueCursor: "", isDone: true };
    const result = await ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    return {
      page: await summarize(ctx, result.page),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const getUserUrlsNotInCollection = query({
  args: { collectionId: v.id("collections") },
  returns: v.array(pickerRow),
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    const collection = await ctx.db.get(collectionId);
    if (!user || collection?.userTableId !== user._id) return [];
    const urls = await ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .order("desc")
      .take(100);
    const available = await Promise.all(
      urls.map(async (url) => {
        const member = await ctx.db
          .query("collectionLinks")
          .withIndex("by_collectionId_and_urlId", (q) =>
            q.eq("collectionId", collectionId).eq("urlId", url._id),
          )
          .unique();
        return member ||
          (!collection.membersReady && collection.urls.includes(url._id))
          ? null
          : {
              _id: url._id,
              fullurl: url.fullurl,
              shortUrl: url.shortUrl,
              slugAssigned: url.slugAssigned,
              _creationTime: url._creationTime,
            };
      }),
    );
    return available.filter(
      (url): url is NonNullable<typeof url> => url !== null,
    );
  },
});

export const addUrlToCollection = mutation({
  args: { collectionId: v.id("collections"), urlId: v.id("urls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const collection = await ctx.db.get(args.collectionId);
    if (!user || collection?.userTableId !== user._id)
      throw new ConvexError("Collection not found or access denied");
    await addLinkToCollection(ctx, args.collectionId, args.urlId);
    return null;
  },
});

export const createCollection = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    collectionColor: v.string(),
  },
  returns: v.id("collections"),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Please sign in");
    const name = args.name.trim();
    if (!name || name.length > 100)
      throw new ConvexError(
        "Collection names must contain 1 to 100 characters",
      );
    const normalizedName = name.toLowerCase();
    const duplicate = await ctx.db
      .query("collections")
      .withIndex("by_user_and_normalizedName", (q) =>
        q.eq("userTableId", user._id).eq("normalizedName", normalizedName),
      )
      .first();
    if (duplicate) throw new ConvexError("You already have that collection");
    return ctx.db.insert("collections", {
      name,
      description: args.description ?? "",
      userTableId: user._id,
      urls: [],
      collectionColor: args.collectionColor,
      normalizedName,
      shareAble: false,
      membersReady: true,
      linkCount: 0,
    });
  },
});

export const deleteCollection = mutation({
  args: { collectionId: v.id("collections") },
  returns: v.null(),
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    const collection = await ctx.db.get(collectionId);
    if (!user || collection?.userTableId !== user._id)
      throw new ConvexError("Collection not found or access denied");
    await ctx.db.delete(collectionId);
    await ctx.scheduler.runAfter(
      0,
      internal.collectionMangament.removeCollectionMembers,
      { collectionId },
    );
    return null;
  },
});
export const removeCollectionMembers = internalMutation({
  args: { collectionId: v.id("collections") },
  returns: v.null(),
  handler: async (ctx, { collectionId }) => {
    const members = await ctx.db
      .query("collectionLinks")
      .withIndex("by_collectionId_and_urlId", (q) =>
        q.eq("collectionId", collectionId),
      )
      .take(BATCH_SIZE);
    for (const member of members) await ctx.db.delete(member._id);
    if (members.length === BATCH_SIZE)
      await ctx.scheduler.runAfter(
        0,
        internal.collectionMangament.removeCollectionMembers,
        { collectionId },
      );
    return null;
  },
});

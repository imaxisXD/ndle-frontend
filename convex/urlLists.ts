import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { accountCounter, accountCountsReady } from "./accountCounters";
import schema from "./schema";

const link = v.object({
  _id: v.id("urls"),
  _creationTime: v.number(),
  ...schema.tables.urls.validator.fields,
});
const analytics = v.object({
  _id: v.id("urlAnalytics"),
  _creationTime: v.number(),
  ...schema.tables.urlAnalytics.validator.fields,
  totalClickCounts: v.number(),
});
const health = v.object({
  _id: v.id("linkHealthChecks"),
  _creationTime: v.number(),
  ...schema.tables.linkHealthChecks.validator.fields,
});
const row = v.object({
  ...link.fields,
  analytics: v.union(analytics, v.null()),
  latestHealthCheck: v.union(health, v.null()),
});
const picker = v.object({
  _id: v.id("urls"),
  _creationTime: v.number(),
  fullurl: v.string(),
  shortUrl: v.string(),
  slugAssigned: v.optional(v.string()),
});
const pageFields = { continueCursor: v.string(), isDone: v.boolean() };

async function enrich(ctx: QueryCtx, urls: Doc<"urls">[]) {
  return Promise.all(
    urls.map(async (url) => {
      const [savedAnalytics, latestHealthCheck, totalClickCounts] =
        await Promise.all([
          ctx.db
            .query("urlAnalytics")
            .withIndex("by_url", (q) => q.eq("urlId", url._id))
            .unique(),
          ctx.db
            .query("linkHealthChecks")
            .withIndex("by_url_id", (q) => q.eq("urlId", url._id))
            .unique(),
          accountCounter.count(ctx, `url:${url._id}`),
        ]);
      return {
        ...url,
        analytics: savedAnalytics
          ? { ...savedAnalytics, totalClickCounts }
          : null,
        latestHealthCheck,
      };
    }),
  );
}

export const getUserUrlsPage = query({
  args: {
    collectionId: v.optional(v.id("collections")),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({ page: v.array(row), ...pageFields }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { page: [], continueCursor: "", isDone: true };
    const options = {
      ...args.paginationOpts,
      numItems: Math.min(50, args.paginationOpts.numItems),
    };
    if (args.collectionId) {
      const collection = await ctx.db.get(args.collectionId);
      if (
        !collection ||
        collection.userTableId !== user._id ||
        !collection.membersReady
      )
        return { page: [], continueCursor: "", isDone: true };
      const result = await ctx.db
        .query("collectionLinks")
        .withIndex("by_collectionId_and_urlId", (q) =>
          q.eq("collectionId", collection._id),
        )
        .paginate(options);
      const urls = await Promise.all(
        result.page.map((member) => ctx.db.get(member.urlId)),
      );
      const owned = urls.filter(
        (url): url is Doc<"urls"> =>
          url !== null && url.userTableId === user._id,
      );
      return {
        page: await enrich(ctx, owned),
        continueCursor: result.continueCursor,
        isDone: result.isDone,
      };
    }
    const result = await ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .order("desc")
      .paginate(options);
    return {
      page: await enrich(ctx, result.page),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const getAvailableUrlsPage = query({
  args: {
    collectionId: v.id("collections"),
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({ page: v.array(picker), ...pageFields }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const collection = await ctx.db.get(args.collectionId);
    if (!user || collection?.userTableId !== user._id)
      return { page: [], continueCursor: "", isDone: true };
    const result = await ctx.db
      .query("urls")
      .withIndex("by_user", (q) => q.eq("userTableId", user._id))
      .order("desc")
      .paginate({
        ...args.paginationOpts,
        numItems: Math.min(50, args.paginationOpts.numItems),
      });
    const available = await Promise.all(
      result.page.map(async (url) => {
        const member = await ctx.db
          .query("collectionLinks")
          .withIndex("by_collectionId_and_urlId", (q) =>
            q.eq("collectionId", collection._id).eq("urlId", url._id),
          )
          .unique();
        if (
          member ||
          (!collection.membersReady && collection.urls.includes(url._id))
        )
          return null;
        return {
          _id: url._id,
          _creationTime: url._creationTime,
          fullurl: url.fullurl,
          shortUrl: url.shortUrl,
          slugAssigned: url.slugAssigned,
        };
      }),
    );
    return {
      page: available.filter(
        (url): url is NonNullable<typeof url> => url !== null,
      ),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const getUrlListCount = query({
  args: { collectionId: v.optional(v.id("collections")) },
  returns: v.union(v.number(), v.null()),
  handler: async (ctx, { collectionId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;
    if (collectionId) {
      const collection = await ctx.db.get(collectionId);
      return collection?.userTableId === user._id && collection.membersReady
        ? (collection.linkCount ?? 0)
        : null;
    }
    if (!(await accountCountsReady(ctx, user._id))) return null;
    return accountCounter.count(ctx, `user-links:${user._id}`);
  },
});

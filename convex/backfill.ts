import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { makeGuestOwnerKey, makeUserOwnerKey } from "./ownership";

const BACKFILL_TABLES = [
  "urls",
  "clickEvents",
  "linkHealthChecks",
  "linkHealthDailySummary",
  "linkIncidents",
] as const;

const tableValidator = v.union(
  v.literal("urls"),
  v.literal("clickEvents"),
  v.literal("linkHealthChecks"),
  v.literal("linkHealthDailySummary"),
  v.literal("linkIncidents"),
);

type BackfillTable = (typeof BACKFILL_TABLES)[number];

function getLegacyOwnerKey(args: {
  analyticsOwnerKey?: string;
  userId?: string;
  guestId?: string;
}) {
  if (args.analyticsOwnerKey) {
    return args.analyticsOwnerKey;
  }
  if (args.guestId) {
    return makeGuestOwnerKey(args.guestId);
  }
  if (args.userId) {
    return makeUserOwnerKey(args.userId);
  }
  return undefined;
}

export const runLegacyOwnerBackfillBatch = internalMutation({
  args: {
    table: tableValidator,
    cursor: v.optional(v.union(v.string(), v.null())),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = Math.min(Math.max(args.batchSize ?? 100, 1), 500);
    if (args.table === "urls") {
      const paginated = await ctx.db.query("urls").order("asc").paginate({
        cursor: args.cursor ?? null,
        numItems: batchSize,
      });

      let patched = 0;
      for (const row of paginated.page) {
        const patch: {
          ownershipState?: "guest" | "user";
          analyticsOwnerKey?: string;
        } = {};

        if (!row.ownershipState) {
          if (row.guestId) {
            patch.ownershipState = "guest";
          } else if (row.userTableId) {
            patch.ownershipState = "user";
          }
        }

        if (!row.analyticsOwnerKey) {
          if (row.guestId) {
            patch.analyticsOwnerKey = makeGuestOwnerKey(row.guestId);
          } else if (row.userTableId) {
            patch.analyticsOwnerKey = makeUserOwnerKey(row.userTableId);
          }
        }

        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(row._id, patch);
          patched += 1;
        }
      }

      return {
        table: args.table,
        scanned: paginated.page.length,
        patched,
        isDone: paginated.isDone,
        continueCursor: paginated.isDone ? null : paginated.continueCursor,
      };
    }

    const paginated =
      args.table === "clickEvents"
        ? await ctx.db.query("clickEvents").order("asc").paginate({
            cursor: args.cursor ?? null,
            numItems: batchSize,
          })
        : args.table === "linkHealthChecks"
          ? await ctx.db.query("linkHealthChecks").order("asc").paginate({
              cursor: args.cursor ?? null,
              numItems: batchSize,
            })
          : args.table === "linkHealthDailySummary"
            ? await ctx.db.query("linkHealthDailySummary").order("asc").paginate({
                cursor: args.cursor ?? null,
                numItems: batchSize,
              })
            : await ctx.db.query("linkIncidents").order("asc").paginate({
                cursor: args.cursor ?? null,
                numItems: batchSize,
              });

    let patched = 0;

    for (const row of paginated.page) {
      const ownerKey = getLegacyOwnerKey({
        analyticsOwnerKey: row.analyticsOwnerKey,
        userId: "userId" in row ? row.userId : undefined,
        guestId: row.guestId,
      });

      if (!row.analyticsOwnerKey && ownerKey) {
        await ctx.db.patch(row._id, {
          analyticsOwnerKey: ownerKey,
        });
        patched += 1;
      }
    }

    return {
      table: args.table,
      scanned: paginated.page.length,
      patched,
      isDone: paginated.isDone,
      continueCursor: paginated.isDone ? null : paginated.continueCursor,
    };
  },
});

export const runLegacyOwnerBackfill = action({
  args: {
    sharedSecret: v.string(),
    batchSize: v.optional(v.number()),
    maxBatches: v.optional(v.number()),
    startTable: v.optional(tableValidator),
    startCursor: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    if (args.sharedSecret !== process.env.SHARED_SECRET) {
      throw new Error("Invalid shared secret");
    }

    const batchSize = Math.min(Math.max(args.batchSize ?? 100, 1), 500);
    const maxBatches = Math.min(Math.max(args.maxBatches ?? 25, 1), 200);
    const startIndex = args.startTable
      ? BACKFILL_TABLES.indexOf(args.startTable)
      : 0;

    if (startIndex < 0) {
      throw new Error("Invalid start table");
    }

    const totals = BACKFILL_TABLES.map((table) => ({
      table,
      scanned: 0,
      patched: 0,
    }));

    let batchesUsed = 0;
    let currentTableIndex = startIndex;
    let currentCursor = args.startCursor ?? null;

    while (currentTableIndex < BACKFILL_TABLES.length && batchesUsed < maxBatches) {
      const table = BACKFILL_TABLES[currentTableIndex];
      const result: {
        table: BackfillTable;
        scanned: number;
        patched: number;
        isDone: boolean;
        continueCursor: string | null;
      } = await ctx.runMutation(internal.backfill.runLegacyOwnerBackfillBatch, {
        table,
        cursor: currentCursor,
        batchSize,
      });

      const totalRow = totals.find((item) => item.table === table);
      if (totalRow) {
        totalRow.scanned += result.scanned;
        totalRow.patched += result.patched;
      }

      batchesUsed += 1;

      if (result.isDone) {
        currentTableIndex += 1;
        currentCursor = null;
      } else {
        currentCursor = result.continueCursor;
      }
    }

    const done = currentTableIndex >= BACKFILL_TABLES.length;

    return {
      done,
      batchSize,
      batchesUsed,
      nextTable: done ? null : BACKFILL_TABLES[currentTableIndex],
      nextCursor: done ? null : currentCursor,
      totals,
    };
  },
});

import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { ensureGuestId } from "./ownership";
import { verifyGuestSessionToken } from "./guestTokens";

export async function upsertGuestSession(
  ctx: MutationCtx,
  guestId: string,
  email?: string,
) {
  const normalizedGuestId = ensureGuestId(guestId);
  const normalizedEmail = email?.trim().toLowerCase() || undefined;
  const existing = await ctx.db
    .query("guest_sessions")
    .withIndex("by_guest_id", (q) => q.eq("guestId", normalizedGuestId))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      email: normalizedEmail ?? existing.email,
      updatedAt: Date.now(),
    });
    return existing._id;
  }

  return await ctx.db.insert("guest_sessions", {
    guestId: normalizedGuestId,
    email: normalizedEmail,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function getClaimableGuestSessions(
  ctx: MutationCtx,
  guestId: string | undefined,
): Promise<Array<Doc<"guest_sessions">>> {
  const sessionMap = new Map<string, Doc<"guest_sessions">>();

  if (guestId?.trim()) {
    let normalizedGuestId: string;
    try {
      normalizedGuestId = ensureGuestId(guestId);
    } catch {
      return [];
    }
    const directMatch = await ctx.db
      .query("guest_sessions")
      .withIndex("by_guest_id", (q) => q.eq("guestId", normalizedGuestId))
      .collect();

    for (const session of directMatch) {
      if (!session.claimedAt) {
        sessionMap.set(session._id, session);
      }
    }
  }

  return Array.from(sessionMap.values());
}

export const saveGuestEmail = mutation({
  args: {
    guestId: v.string(),
    guestToken: v.string(),
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) {
      throw new ConvexError("Email is required");
    }
    const guestId = ensureGuestId(args.guestId);
    await verifyGuestSessionToken(guestId, args.guestToken);
    await upsertGuestSession(ctx, guestId, email);
    return { success: true };
  },
});

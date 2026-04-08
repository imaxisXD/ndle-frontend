import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";

export async function upsertGuestSession(
  ctx: MutationCtx,
  guestId: string,
  email?: string,
) {
  const normalizedGuestId = guestId.trim();
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
  email: string | undefined,
): Promise<Array<Doc<"guest_sessions">>> {
  const sessionMap = new Map<string, Doc<"guest_sessions">>();

  if (guestId?.trim()) {
    const directMatch = await ctx.db
      .query("guest_sessions")
      .withIndex("by_guest_id", (q) => q.eq("guestId", guestId.trim()))
      .collect();

    for (const session of directMatch) {
      if (!session.claimedAt) {
        sessionMap.set(session._id, session);
      }
    }
  }

  if (email?.trim()) {
    const emailMatches = await ctx.db
      .query("guest_sessions")
      .withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase()))
      .collect();

    for (const session of emailMatches) {
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
    await upsertGuestSession(ctx, args.guestId, email);
    return { success: true };
  },
});


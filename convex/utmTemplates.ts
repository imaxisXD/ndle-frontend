import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Get all UTM templates for the current user
 */
export const getTemplates = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }
    return await ctx.db
      .query("utm_templates")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Create a new UTM template
 */
export const createTemplate = mutation({
  args: {
    name: v.string(),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Check if template with same name exists
    const existing = await ctx.db
      .query("utm_templates")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", user._id).eq("name", args.name.trim()),
      )
      .unique();

    if (existing) {
      throw new ConvexError("A template with this name already exists");
    }

    return await ctx.db.insert("utm_templates", {
      userId: user._id,
      name: args.name.trim(),
      utmSource: args.utmSource?.trim() || undefined,
      utmMedium: args.utmMedium?.trim() || undefined,
      utmCampaign: args.utmCampaign?.trim() || undefined,
      utmTerm: args.utmTerm?.trim() || undefined,
      utmContent: args.utmContent?.trim() || undefined,
      usageCount: 0,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update a UTM template
 */
export const updateTemplate = mutation({
  args: {
    templateId: v.id("utm_templates"),
    name: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    utmTerm: v.optional(v.string()),
    utmContent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== user._id) {
      throw new ConvexError("Template not found or access denied");
    }

    const updates: Partial<{
      name: string;
      utmSource: string;
      utmMedium: string;
      utmCampaign: string;
      utmTerm: string;
      utmContent: string;
    }> = {};

    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.utmSource !== undefined) updates.utmSource = args.utmSource.trim();
    if (args.utmMedium !== undefined) updates.utmMedium = args.utmMedium.trim();
    if (args.utmCampaign !== undefined)
      updates.utmCampaign = args.utmCampaign.trim();
    if (args.utmTerm !== undefined) updates.utmTerm = args.utmTerm.trim();
    if (args.utmContent !== undefined)
      updates.utmContent = args.utmContent.trim();

    await ctx.db.patch(args.templateId, updates);
    return args.templateId;
  },
});

/**
 * Delete a UTM template
 */
export const deleteTemplate = mutation({
  args: {
    templateId: v.id("utm_templates"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== user._id) {
      throw new ConvexError("Template not found or access denied");
    }

    await ctx.db.delete(args.templateId);
    return true;
  },
});

/**
 * Increment the usage count of a template (called when template is applied)
 */
export const incrementTemplateUsage = mutation({
  args: {
    templateId: v.id("utm_templates"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new ConvexError("User not found");
    }

    const template = await ctx.db.get(args.templateId);
    if (!template || template.userId !== user._id) {
      throw new ConvexError("Template not found or access denied");
    }

    await ctx.db.patch(args.templateId, {
      usageCount: (template.usageCount ?? 0) + 1,
    });
    return true;
  },
});

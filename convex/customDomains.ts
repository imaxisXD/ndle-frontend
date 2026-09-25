import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  internalAction,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";
import { getViewerPlan } from "./ownership";
import { queueDomainSync } from "./domainSync";
import { queueServiceSync, queueUrlSync } from "./serviceSync";
import { normalizeHostname } from "./utils";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DOMAINS_FREE = 1;
const MAX_DOMAINS_PRO = 3;
// Plans allow at most three domains. Keep reads bounded for legacy accounts too.
const MAX_DOMAINS_READ = 100;
// Each detached link also queues two sync jobs; keep one transaction well bounded.
const DETACH_LINKS_BATCH_SIZE = 100;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates that a domain string is properly formatted.
 * Accepts subdomains (links.example.com) and root domains (example.com)
 */
function isValidDomain(domain: string): boolean {
  // Basic domain pattern: allows subdomains and root domains
  const domainPattern =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainPattern.test(domain);
}

/**
 * Normalizes domain to lowercase and removes:
 * - http:// or https:// prefixes
 * - www. prefix
 * - trailing dots and slashes
 * - any path after the domain
 */
function normalizeDomain(domain: string): string {
  let normalized = domain.toLowerCase().trim();

  // Remove protocol (http:// or https://)
  normalized = normalized.replace(/^https?:\/\//, "");

  // Remove www. prefix
  normalized = normalized.replace(/^www\./, "");

  // Remove any path (everything after the first /)
  normalized = normalized.split("/")[0];

  // Remove trailing dots
  normalized = normalized.replace(/\.$/, "");

  return normalized;
}

/** The link keeps working on the default domain; its projection gets `domain: null`. */
export async function detachLinkFromDomain(ctx: MutationCtx, url: Doc<"urls">) {
  await ctx.db.patch(url._id, { customDomain: undefined });
  const detached = await ctx.db.get(url._id);
  if (detached) await queueUrlSync(ctx, detached);
}

/**
 * Move one page of an owner's links off a hostname they no longer hold, then
 * continue in the background. The links keep working on the default domain, and
 * a later owner of the hostname can never serve them.
 */
async function detachDomainLinksPage(
  ctx: MutationCtx,
  userId: Id<"users">,
  hostname: string,
  cursor: string | null,
) {
  const result = await ctx.db
    .query("urls")
    .withIndex("by_user", (q) => q.eq("userTableId", userId))
    .paginate({ cursor, numItems: DETACH_LINKS_BATCH_SIZE });
  for (const url of result.page) {
    if (url.customDomain && normalizeHostname(url.customDomain) === hostname)
      await detachLinkFromDomain(ctx, url);
  }
  if (!result.isDone)
    await ctx.scheduler.runAfter(0, internal.customDomains.detachDomainLinks, {
      userId,
      hostname,
      cursor: result.continueCursor,
    });
}

/**
 * Get the domain limit for a user based on their membership
 */
function getDomainLimit(membership: string): number {
  return getViewerPlan(membership) === "pro"
    ? MAX_DOMAINS_PRO
    : MAX_DOMAINS_FREE;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all custom domains for the current user
 */
export const listUserDomains = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("custom_domains"),
      domain: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("failed"),
      ),
      sslStatus: v.optional(v.string()),
      verificationTxtName: v.optional(v.string()),
      verificationTxtValue: v.optional(v.string()),
      createdAt: v.number(),
      verifiedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const domains = await ctx.db
      .query("custom_domains")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(MAX_DOMAINS_READ);

    return domains.map((d) => ({
      _id: d._id,
      domain: d.domain,
      status: d.status,
      sslStatus: d.sslStatus,
      verificationTxtName: d.verificationTxtName,
      verificationTxtValue: d.verificationTxtValue,
      createdAt: d.createdAt,
      verifiedAt: d.verifiedAt,
    }));
  },
});

/**
 * Get active domains for the URL shortener domain selector.
 * Returns only domains with "active" status.
 */
export const getActiveDomains = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("custom_domains"),
      domain: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    const domains = await ctx.db
      .query("custom_domains")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(MAX_DOMAINS_READ);

    return domains
      .filter((domain) => domain.status === "active")
      .map((d) => ({
        _id: d._id,
        domain: d.domain,
      }));
  },
});

/**
 * Get domain limits and usage for the current user
 */
export const getDomainLimits = query({
  args: {},
  returns: v.object({
    used: v.number(),
    limit: v.number(),
    canAddMore: v.boolean(),
    isPro: v.boolean(),
    membership: v.string(),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        used: 0,
        limit: 0,
        canAddMore: false,
        isPro: false,
        membership: "guest",
      };
    }

    const domains = await ctx.db
      .query("custom_domains")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(MAX_DOMAINS_READ);

    const limit = getDomainLimit(user.membership);
    const used = domains.length;

    return {
      used,
      limit,
      canAddMore: used < limit,
      isPro: getViewerPlan(user.membership) === "pro",
      membership: user.membership,
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a new custom domain for the current user.
 * Validates membership, domain format, and limits.
 */
export const addDomain = mutation({
  args: { domain: v.string() },
  returns: v.object({
    success: v.boolean(),
    domainId: v.optional(v.id("custom_domains")),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Normalize and validate domain
    const domain = normalizeDomain(args.domain);

    if (!isValidDomain(domain)) {
      return {
        success: false,
        error: "Invalid domain format. Use format: links.example.com",
      };
    }

    // Check if domain already exists (for any user)
    const existingDomain = await ctx.db
      .query("custom_domains")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .unique();

    if (existingDomain?.userId === user._id) {
      return { success: true, domainId: existingDomain._id };
    }

    // A delayed status update is not proof that a domain has been abandoned.
    if (existingDomain) {
      return { success: false, error: "This domain is already registered" };
    }

    // Check domain limit
    const userDomains = await ctx.db
      .query("custom_domains")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(MAX_DOMAINS_READ);

    const limit = getDomainLimit(user.membership);
    if (userDomains.length >= limit) {
      return {
        success: false,
        error: `Your plan allows up to ${limit} custom domains`,
      };
    }

    // Create the domain record with pending status
    const domainId = await ctx.db.insert("custom_domains", {
      userId: user._id,
      domain,
      status: "pending",
      createdAt: Date.now(),
    });

    await queueServiceSync(ctx, `domain:${domain}`, {
      kind: "domain",
      hostname: domain,
      domainId,
    });

    return { success: true, domainId };
  },
});

/**
 * Delete a custom domain.
 * Only the owner can delete their domain.
 * Schedules Cloudflare hostname deletion if applicable.
 */
export const deleteDomain = mutation({
  args: { domainId: v.id("custom_domains") },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const domain = await ctx.db.get(args.domainId);
    if (!domain) {
      console.log("Domain not found");
      return { success: false, error: "Domain not found" };
    }

    // Verify ownership
    if (domain.userId !== user._id) {
      console.log("Not authorized to delete this domain");
      return { success: false, error: "Not authorized to delete this domain" };
    }

    // Retain the hostname even if registration has not saved its Cloudflare ID yet.
    await queueDomainSync(ctx, domain);
    await ctx.db.delete(args.domainId);
    await detachDomainLinksPage(
      ctx,
      domain.userId,
      normalizeHostname(domain.domain),
      null,
    );

    return { success: true };
  },
});

/**
 * Verify a custom domain's status with Cloudflare.
 * Schedules the verification action to check SSL status.
 */
export const verifyDomain = mutation({
  args: { domainId: v.id("custom_domains") },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const domain = await ctx.db.get(args.domainId);
    if (!domain) {
      return { success: false, error: "Domain not found" };
    }

    // Verify ownership
    if (domain.userId !== user._id) {
      return { success: false, error: "Not authorized" };
    }

    await queueDomainSync(ctx, domain);

    return { success: true };
  },
});

/**
 * Internal mutation to update domain after Cloudflare API call
 */
// Keep these entry points for actions that were scheduled before durable sync shipped.
export const internalUpdateDomain = internalMutation({
  args: {
    domainId: v.id("custom_domains"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("failed"),
    ),
    cloudflareHostnameId: v.optional(v.string()),
    sslStatus: v.optional(v.string()),
    verificationTxtName: v.optional(v.string()),
    verificationTxtValue: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (!domain) {
      if (args.cloudflareHostnameId) {
        await queueServiceSync(ctx, `domain-id:${args.cloudflareHostnameId}`, {
          kind: "domain_lookup",
          hostnameId: args.cloudflareHostnameId,
        });
      }
      return null;
    }
    const { domainId, ...updates } = args;
    await ctx.db.patch(domainId, {
      ...Object.fromEntries(
        Object.entries(updates).filter(([, value]) => value !== undefined),
      ),
      ...(args.status === "active" ? { verifiedAt: Date.now() } : {}),
    });
    await queueDomainSync(ctx, domain);
    return null;
  },
});

export const internalDeleteDomain = internalMutation({
  args: { domainId: v.id("custom_domains") },
  returns: v.null(),
  handler: async (ctx, { domainId }) => {
    const domain = await ctx.db.get(domainId);
    if (domain) {
      await queueDomainSync(ctx, domain);
      await ctx.db.delete(domainId);
      await detachDomainLinksPage(
        ctx,
        domain.userId,
        normalizeHostname(domain.domain),
        null,
      );
    }
    return null;
  },
});

/** Continues a domain deletion for owners with more links than one page. */
export const detachDomainLinks = internalMutation({
  args: {
    userId: v.id("users"),
    hostname: v.string(),
    cursor: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, { userId, hostname, cursor }) => {
    // The owner added the hostname back, so their remaining links are valid again.
    const current = await ctx.db
      .query("custom_domains")
      .withIndex("by_domain", (q) => q.eq("domain", hostname))
      .unique();
    if (current?.userId === userId) return null;
    await detachDomainLinksPage(ctx, userId, hostname, cursor);
    return null;
  },
});

export const internalDeleteFromCloudflare = internalAction({
  args: { cloudflareHostnameId: v.string() },
  returns: v.null(),
  handler: async (ctx, { cloudflareHostnameId }) => {
    // Save the ID first: even the lookup needed to recover a legacy hostname can fail.
    await ctx.runMutation(internal.serviceSync.enqueue, {
      key: `domain-id:${cloudflareHostnameId}`,
      target: { kind: "domain_lookup", hostnameId: cloudflareHostnameId },
    });
    return null;
  },
});

export const internalRegisterWithCloudflare = internalAction({
  args: { domainId: v.id("custom_domains") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.domainSync.requestDomainSync, args);
    return null;
  },
});

export const internalVerifyDomainStatus = internalAction({
  args: { domainId: v.id("custom_domains") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.domainSync.requestDomainSync, args);
    return null;
  },
});

// ============================================================================
// INTERNAL QUERIES (for actions to call)
// ============================================================================

/**
 * Internal query to get domain by ID (for actions)
 */
export const getDomainById = internalQuery({
  args: { domainId: v.id("custom_domains") },
  returns: v.union(
    v.object({
      _id: v.id("custom_domains"),
      userId: v.id("users"),
      domain: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("active"),
        v.literal("failed"),
      ),
      cloudflareHostnameId: v.optional(v.string()),
      sslStatus: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (!domain) {
      return null;
    }
    return {
      _id: domain._id,
      userId: domain.userId,
      domain: domain.domain,
      status: domain.status,
      cloudflareHostnameId: domain.cloudflareHostnameId,
      sslStatus: domain.sslStatus,
    };
  },
});

/**
 * Bounded compatibility query; the cron uses paginated domain sync.
 */
export const getPendingDomains = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("custom_domains"),
      domain: v.string(),
      cloudflareHostnameId: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    const domains = await ctx.db
      .query("custom_domains")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(MAX_DOMAINS_READ);

    return domains.map((d) => ({
      _id: d._id,
      domain: d.domain,
      cloudflareHostnameId: d.cloudflareHostnameId,
    }));
  },
});

/**
 * Queue bounded pages of pending domains for durable status checks.
 * This is called by a cron job every 2 minutes.
 */
export const checkAllPendingDomains = internalAction({
  args: {},
  returns: v.object({
    checked: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx): Promise<{ checked: number; updated: number }> => {
    const checked = await ctx.runMutation(
      internal.domainSync.queuePendingDomainPage,
      { cursor: null },
    );
    return { checked, updated: 0 };
  },
});

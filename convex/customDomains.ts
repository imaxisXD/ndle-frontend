import { v, type Infer } from "convex/values";
import {
  action,
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
import { getClaimedDomain, queueDomainSync } from "./domainSync";
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
// Unverified rows never claim a hostname, but each account may only hold a few.
const MAX_UNVERIFIED_DOMAINS = 3;
export const UNVERIFIED_DOMAIN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VERIFY_ATTEMPT_INTERVAL_MS = 10_000;
const CLEANUP_BATCH_SIZE = 100;
const DNS_LOOKUP_TIMEOUT_MS = 5_000;
const TXT_RECORD_TYPE = 16;
const DNS_NXDOMAIN = 3;

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

/** Where the owner publishes the ownership challenge. */
export function challengeRecordName(domain: string): string {
  return `_ndle-challenge.${domain}`;
}

export function challengeRecordValue(challengeToken: string): string {
  return `ndle-verify=${challengeToken}`;
}

function createChallengeToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * TXT data arrives in presentation format: one or more quoted strings that
 * together form the record, with backslash and \DDD escapes.
 */
function parseTxtData(data: string): string {
  const parts = [...data.matchAll(/"((?:[^"\\]|\\.)*)"/g)];
  if (parts.length === 0) return data.trim();
  return parts
    .map(([, part]) =>
      part.replace(/\\(\d{3}|.)/g, (_, escaped: string) =>
        escaped.length === 3 ? String.fromCharCode(Number(escaped)) : escaped,
      ),
    )
    .join("");
}

/** TXT records at `name`, via DNS-over-HTTPS. A missing name is an empty answer. */
async function lookupTxtRecords(name: string): Promise<string[]> {
  const response = await fetch(
    `https://cloudflare-dns.com/dns-query?${new URLSearchParams({ name, type: "TXT" })}`,
    {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(DNS_LOOKUP_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    throw new Error(`DNS lookup failed (HTTP ${response.status})`);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!isObject(body) || typeof body.Status !== "number") {
    throw new Error("DNS lookup returned an invalid response");
  }
  if (body.Status === DNS_NXDOMAIN) return [];
  if (body.Status !== 0) {
    throw new Error(`DNS lookup failed (status ${body.Status})`);
  }
  const answers: unknown[] = Array.isArray(body.Answer) ? body.Answer : [];
  return answers.flatMap((answer) =>
    isObject(answer) &&
    answer.type === TXT_RECORD_TYPE &&
    typeof answer.data === "string"
      ? [parseTxtData(answer.data)]
      : [],
  );
}

function isUnverifiedExpired(domain: Doc<"custom_domains">, now: number) {
  return domain._creationTime + UNVERIFIED_DOMAIN_TTL_MS <= now;
}

/**
 * Once an account proves a hostname, other accounts' attempts at it are moot.
 * Deletes one page and continues in the background.
 */
async function removeUnverifiedDomainsPage(ctx: MutationCtx, hostname: string) {
  const attempts = await ctx.db
    .query("custom_domains")
    .withIndex("by_domain_and_status", (q) =>
      q.eq("domain", hostname).eq("status", "awaiting_verification"),
    )
    .take(CLEANUP_BATCH_SIZE);
  for (const attempt of attempts) {
    await ctx.db.delete("custom_domains", attempt._id);
  }
  if (attempts.length === CLEANUP_BATCH_SIZE) {
    await ctx.scheduler.runAfter(
      0,
      internal.customDomains.removeUnverifiedDomains,
      { hostname },
    );
  }
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
        v.literal("awaiting_verification"),
        v.literal("pending"),
        v.literal("active"),
        v.literal("failed"),
      ),
      sslStatus: v.optional(v.string()),
      verificationTxtName: v.optional(v.string()),
      verificationTxtValue: v.optional(v.string()),
      // Ownership challenge, shown only until the domain is verified.
      challengeRecordName: v.optional(v.string()),
      challengeRecordValue: v.optional(v.string()),
      challengeExpiresAt: v.optional(v.number()),
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

    return domains.map((d) => {
      const awaiting = d.status === "awaiting_verification" && !!d.challengeToken;
      return {
        _id: d._id,
        domain: d.domain,
        status: d.status,
        sslStatus: d.sslStatus,
        verificationTxtName: d.verificationTxtName,
        verificationTxtValue: d.verificationTxtValue,
        challengeRecordName: awaiting ? challengeRecordName(d.domain) : undefined,
        challengeRecordValue:
          awaiting && d.challengeToken
            ? challengeRecordValue(d.challengeToken)
            : undefined,
        challengeExpiresAt: awaiting
          ? d._creationTime + UNVERIFIED_DOMAIN_TTL_MS
          : undefined,
        createdAt: d.createdAt,
        verifiedAt: d.verifiedAt,
      };
    });
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
 * Validates membership, domain format, and limits. The hostname is not claimed
 * and nothing is created in Cloudflare until the owner proves control of its
 * DNS with `verifyDomain`.
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

    // Only a verified (or grandfathered) row holds the hostname for one account.
    const holder = await getClaimedDomain(ctx, domain);

    if (holder?.userId === user._id) {
      return { success: true, domainId: holder._id };
    }

    // A delayed status update is not proof that a domain has been abandoned.
    if (holder) {
      return { success: false, error: "This domain is already registered" };
    }

    // Check domain limit
    const userDomains = await ctx.db
      .query("custom_domains")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(MAX_DOMAINS_READ);

    const ownAttempt = userDomains.find((d) => d.domain === domain);
    if (ownAttempt) {
      return { success: true, domainId: ownAttempt._id };
    }

    const unverified = userDomains.filter(
      (d) => d.status === "awaiting_verification",
    ).length;
    if (unverified >= MAX_UNVERIFIED_DOMAINS) {
      return {
        success: false,
        error: `You can have up to ${MAX_UNVERIFIED_DOMAINS} domains waiting for verification. Verify or remove one first.`,
      };
    }

    const limit = getDomainLimit(user.membership);
    if (userDomains.length >= limit) {
      return {
        success: false,
        error: `Your plan allows up to ${limit} custom domains`,
      };
    }

    // Other accounts may hold unverified rows for the same hostname; the first
    // to publish its challenge record claims it.
    const domainId = await ctx.db.insert("custom_domains", {
      userId: user._id,
      domain,
      status: "awaiting_verification",
      challengeToken: createChallengeToken(),
      createdAt: Date.now(),
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

    // Never claimed: nothing exists in Cloudflare and no link can use it.
    if (domain.status === "awaiting_verification") {
      await ctx.db.delete("custom_domains", domain._id);
      return { success: true };
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

const verificationResult = v.object({
  success: v.boolean(),
  error: v.optional(v.string()),
});
type VerificationResult = Infer<typeof verificationResult>;

const verificationAttempt = v.union(
  v.object({ kind: v.literal("error"), error: v.string() }),
  // Ownership is already settled; the Cloudflare status check was queued.
  v.object({ kind: v.literal("claimed") }),
  v.object({
    kind: v.literal("check"),
    hostname: v.string(),
    challengeToken: v.string(),
  }),
);

/**
 * Prove control of a domain's DNS, then claim it and start the Cloudflare flow.
 * For domains that are already verified (or grandfathered), re-checks their
 * Cloudflare status as before.
 */
export const verifyDomain = action({
  args: { domainId: v.id("custom_domains") },
  returns: verificationResult,
  handler: async (ctx, args): Promise<VerificationResult> => {
    const attempt: Infer<typeof verificationAttempt> = await ctx.runMutation(
      internal.customDomains.startDomainVerification,
      args,
    );
    if (attempt.kind === "error") {
      return { success: false, error: attempt.error };
    }
    if (attempt.kind === "claimed") return { success: true };

    let records: string[];
    try {
      records = await lookupTxtRecords(challengeRecordName(attempt.hostname));
    } catch (error) {
      console.log("[Domains] challenge lookup failed", {
        hostname: attempt.hostname,
        error: error instanceof Error ? error.message : "unknown",
      });
      return {
        success: false,
        error: "We couldn't check your DNS right now. Try again in a minute.",
      };
    }
    // Only the exact value proves control; a prefix or another token does not.
    if (!records.includes(challengeRecordValue(attempt.challengeToken))) {
      return {
        success: false,
        error:
          "We couldn't find the verification TXT record yet. DNS changes can take a few minutes to appear.",
      };
    }
    const result: VerificationResult = await ctx.runMutation(
      internal.customDomains.completeDomainVerification,
      { domainId: args.domainId, challengeToken: attempt.challengeToken },
    );
    return result;
  },
});

/** Checks ownership and records the attempt so DNS is queried at most once per 10 s. */
export const startDomainVerification = internalMutation({
  args: { domainId: v.id("custom_domains") },
  returns: verificationAttempt,
  handler: async (ctx, { domainId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { kind: "error" as const, error: "Not authenticated" };
    }
    const domain = await ctx.db.get("custom_domains", domainId);
    if (!domain) return { kind: "error" as const, error: "Domain not found" };
    if (domain.userId !== user._id) {
      return { kind: "error" as const, error: "Not authorized" };
    }
    if (domain.status !== "awaiting_verification") {
      await queueDomainSync(ctx, domain);
      return { kind: "claimed" as const };
    }
    const now = Date.now();
    if (isUnverifiedExpired(domain, now) || !domain.challengeToken) {
      return {
        kind: "error" as const,
        error: "This verification expired. Remove the domain and add it again.",
      };
    }
    if (
      domain.lastVerificationAttemptAt !== undefined &&
      now - domain.lastVerificationAttemptAt < VERIFY_ATTEMPT_INTERVAL_MS
    ) {
      return {
        kind: "error" as const,
        error: "Please wait a few seconds before checking again.",
      };
    }
    await ctx.db.patch("custom_domains", domain._id, {
      lastVerificationAttemptAt: now,
    });
    return {
      kind: "check" as const,
      hostname: domain.domain,
      challengeToken: domain.challengeToken,
    };
  },
});

/** Claims the hostname exclusively after the challenge record was found. */
export const completeDomainVerification = internalMutation({
  args: { domainId: v.id("custom_domains"), challengeToken: v.string() },
  returns: verificationResult,
  handler: async (ctx, { domainId, challengeToken }) => {
    const user = await getCurrentUser(ctx);
    if (!user) return { success: false, error: "Not authenticated" };
    const domain = await ctx.db.get("custom_domains", domainId);
    if (!domain || domain.userId !== user._id) {
      return { success: false, error: "Domain not found" };
    }
    if (domain.status !== "awaiting_verification") return { success: true };
    // Removed and re-added while DNS was being checked.
    if (domain.challengeToken !== challengeToken) {
      return {
        success: false,
        error: "The verification code changed. Check the TXT record and try again.",
      };
    }
    // Mutations are serialized, so only one account can pass this check.
    if (await getClaimedDomain(ctx, domain.domain)) {
      return {
        success: false,
        error: "Another account has already verified this domain.",
      };
    }
    await ctx.db.patch("custom_domains", domain._id, {
      status: "pending",
      ownershipVerifiedAt: Date.now(),
    });
    // From here on this is the existing flow: the sync job creates the
    // Cloudflare custom hostname and the pending-domain cron polls it.
    await queueDomainSync(ctx, domain);
    await removeUnverifiedDomainsPage(ctx, domain.domain);
    console.log("[Domains] ownership verified", {
      domainId: domain._id,
      hostname: domain.domain,
    });
    return { success: true };
  },
});

/** Continues deleting other accounts' unverified rows for a claimed hostname. */
export const removeUnverifiedDomains = internalMutation({
  args: { hostname: v.string() },
  returns: v.null(),
  handler: async (ctx, { hostname }) => {
    if (await getClaimedDomain(ctx, hostname)) {
      await removeUnverifiedDomainsPage(ctx, hostname);
    }
    return null;
  },
});

/** Cron: unverified rows expire after 7 days. Deletes bounded pages. */
export const expireUnverifiedDomains = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("custom_domains")
      .withIndex("by_status", (q) =>
        q
          .eq("status", "awaiting_verification")
          .lt("_creationTime", Date.now() - UNVERIFIED_DOMAIN_TTL_MS),
      )
      .take(CLEANUP_BATCH_SIZE);
    for (const domain of expired) {
      await ctx.db.delete("custom_domains", domain._id);
    }
    if (expired.length === CLEANUP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.customDomains.expireUnverifiedDomains,
        {},
      );
    }
    return expired.length;
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
    if (domain?.status === "awaiting_verification") {
      await ctx.db.delete("custom_domains", domainId);
    } else if (domain) {
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
    const current = await getClaimedDomain(ctx, hostname);
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
        v.literal("awaiting_verification"),
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

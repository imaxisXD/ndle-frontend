import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  internalMutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { queueUrlSync } from "./serviceSync";
import {
  destinationHostname,
  hostnameWithParents,
  isHostOrSubdomainOf,
  normalizeBlockedDomainInput,
} from "./utils";

/**
 * Internal takedown tools. They are not part of the public API; operators run
 * them from the Convex dashboard or CLI, e.g.
 * `npx convex run --prod moderation:disableLink '{"slug":"abc123"}'`.
 */

export const BLOCKED_DESTINATION_MESSAGE =
  "For safety reasons, this domain has been blocked.";
const DEFAULT_DISABLED_REASON = "Disabled by moderation";
const DEFAULT_BLOCK_REASON = "Blocked by moderation";
const MAX_REASON_LENGTH = 500;
// Each disabled link queues two sync jobs; keep one transaction well bounded.
const BLOCK_SCAN_BATCH_SIZE = 100;

const scanResult = v.object({
  scanned: v.number(),
  disabled: v.number(),
  isDone: v.boolean(),
});
const linkResult = {
  urlId: v.id("urls"),
  slug: v.string(),
};

/** Every destination a link can redirect to: its main URL and any A/B variants. */
function linkDestinations(
  url: Pick<Doc<"urls">, "fullurl" | "abVariants">,
): string[] {
  return [url.fullurl, ...(url.abVariants ?? []).map((variant) => variant.url)];
}

async function findBlockedDomain(
  ctx: QueryCtx,
  destinations: string[],
): Promise<Doc<"blocked_domains"> | null> {
  const checked = new Set<string>();
  for (const destination of destinations) {
    const hostname = destinationHostname(destination);
    if (!hostname) continue;
    for (const candidate of hostnameWithParents(hostname)) {
      if (checked.has(candidate)) continue;
      checked.add(candidate);
      const blocked = await ctx.db
        .query("blocked_domains")
        .withIndex("by_domain", (q) => q.eq("domain", candidate))
        .first();
      if (blocked) return blocked;
    }
  }
  return null;
}

/** New destinations must not use a blocked domain or any of its subdomains. */
export async function ensureDestinationsAllowed(
  ctx: QueryCtx,
  destinations: string[],
) {
  if (await findBlockedDomain(ctx, destinations)) {
    throw new ConvexError(BLOCKED_DESTINATION_MESSAGE);
  }
}

/** Owners can see that a link is disabled, but not moderation notes or the guest network key. */
export function toOwnerLinkView<T extends Doc<"urls">>(url: T): T {
  if (url.disabledReason === undefined && url.guestNetworkKey === undefined) {
    return url;
  }
  const visible = { ...url };
  delete visible.disabledReason;
  delete visible.guestNetworkKey;
  return visible;
}

function normalizeSlug(slug: string): string {
  // Accept a pasted short link as well as the bare slug.
  const value = slug.trim().replace(/^.*\//, "");
  if (!value) throw new ConvexError("A link slug is required");
  return value;
}

function normalizeReason(reason: string | undefined, fallback: string) {
  return reason?.trim().slice(0, MAX_REASON_LENGTH) || fallback;
}

function normalizeDomainArg(domain: string): string {
  const hostname = normalizeBlockedDomainInput(domain);
  // A bare label ("com") would take down every link under a public suffix.
  if (!hostname || !hostname.includes(".")) {
    throw new ConvexError("Enter a hostname such as evil.example");
  }
  return hostname;
}

async function getLinkBySlug(ctx: MutationCtx, slug: string) {
  const url = await ctx.db
    .query("urls")
    .withIndex("by_slug", (q) => q.eq("slugAssigned", slug))
    .unique();
  if (!url) throw new ConvexError(`No link uses the slug "${slug}"`);
  return url;
}

async function getBlockedDomain(ctx: QueryCtx, domain: string) {
  return ctx.db
    .query("blocked_domains")
    .withIndex("by_domain", (q) => q.eq("domain", domain))
    .first();
}

/** The sync job reads the saved row, so the projection then serves is_active: false. */
async function disableUrl(ctx: MutationCtx, url: Doc<"urls">, reason: string) {
  await ctx.db.patch("urls", url._id, {
    disabledAt: url.disabledAt ?? Date.now(),
    disabledReason: reason,
  });
  await queueUrlSync(ctx, url);
}

export const disableLink = internalMutation({
  args: { slug: v.string(), reason: v.optional(v.string()) },
  returns: v.object({ ...linkResult, alreadyDisabled: v.boolean() }),
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    const url = await getLinkBySlug(ctx, slug);
    await disableUrl(
      ctx,
      url,
      normalizeReason(args.reason, url.disabledReason ?? DEFAULT_DISABLED_REASON),
    );
    console.log("[Moderation] disableLink", { urlId: url._id, slug });
    return {
      urlId: url._id,
      slug,
      alreadyDisabled: url.disabledAt !== undefined,
    };
  },
});

export const enableLink = internalMutation({
  args: { slug: v.string() },
  returns: v.object({ ...linkResult, wasDisabled: v.boolean() }),
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    const url = await getLinkBySlug(ctx, slug);
    const blocked = await findBlockedDomain(ctx, linkDestinations(url));
    if (blocked) {
      throw new ConvexError(
        `This link points to the blocked domain ${blocked.domain}. Unblock the domain first.`,
      );
    }
    const wasDisabled = url.disabledAt !== undefined;
    if (wasDisabled || url.disabledReason !== undefined) {
      await ctx.db.patch("urls", url._id, {
        disabledAt: undefined,
        disabledReason: undefined,
      });
    }
    await queueUrlSync(ctx, url);
    console.log("[Moderation] enableLink", { urlId: url._id, slug });
    return { urlId: url._id, slug, wasDisabled };
  },
});

/** Disable one page of links whose destination is on the domain, then continue in the background. */
async function disableBlockedDomainLinksPage(
  ctx: MutationCtx,
  domain: string,
  cursor: string | null,
) {
  const result = await ctx.db
    .query("urls")
    .paginate({ cursor, numItems: BLOCK_SCAN_BATCH_SIZE });
  let disabled = 0;
  for (const url of result.page) {
    if (url.disabledAt !== undefined) continue;
    const matches = linkDestinations(url).some((destination) => {
      const hostname = destinationHostname(destination);
      return !!hostname && isHostOrSubdomainOf(hostname, domain);
    });
    if (!matches) continue;
    await disableUrl(ctx, url, `Blocked domain: ${domain}`);
    disabled += 1;
  }
  console.log("[Moderation] disableBlockedDomainLinks", {
    domain,
    scanned: result.page.length,
    disabled,
    isDone: result.isDone,
  });
  if (!result.isDone) {
    await ctx.scheduler.runAfter(0, internal.moderation.disableBlockedDomainLinks, {
      domain,
      cursor: result.continueCursor,
    });
  }
  return { scanned: result.page.length, disabled, isDone: result.isDone };
}

export const blockDomain = internalMutation({
  args: { domain: v.string(), reason: v.optional(v.string()) },
  returns: v.object({
    domain: v.string(),
    alreadyBlocked: v.boolean(),
    ...scanResult.fields,
  }),
  handler: async (ctx, args) => {
    const domain = normalizeDomainArg(args.domain);
    const existing = await getBlockedDomain(ctx, domain);
    const reason = normalizeReason(
      args.reason,
      existing?.reason ?? DEFAULT_BLOCK_REASON,
    );
    if (existing) {
      await ctx.db.patch("blocked_domains", existing._id, { reason });
    } else {
      await ctx.db.insert("blocked_domains", {
        domain,
        reason,
        createdAt: Date.now(),
      });
    }
    // Re-blocking re-runs the scan, which also repairs an interrupted one.
    const page = await disableBlockedDomainLinksPage(ctx, domain, null);
    return { domain, alreadyBlocked: existing !== null, ...page };
  },
});

/** Continues a domain block across the links table. */
export const disableBlockedDomainLinks = internalMutation({
  args: { domain: v.string(), cursor: v.union(v.string(), v.null()) },
  returns: scanResult,
  handler: async (ctx, { domain, cursor }) => {
    // Unblocking stops the scan; links it already disabled stay disabled until enabled.
    if (!(await getBlockedDomain(ctx, domain))) {
      return { scanned: 0, disabled: 0, isDone: true };
    }
    return disableBlockedDomainLinksPage(ctx, domain, cursor);
  },
});

/** Allows new links again. Links disabled by the block stay disabled; use enableLink per slug. */
export const unblockDomain = internalMutation({
  args: { domain: v.string() },
  returns: v.object({ domain: v.string(), removed: v.boolean() }),
  handler: async (ctx, args) => {
    const domain = normalizeDomainArg(args.domain);
    const rows = await ctx.db
      .query("blocked_domains")
      .withIndex("by_domain", (q) => q.eq("domain", domain))
      .take(10);
    for (const row of rows) await ctx.db.delete("blocked_domains", row._id);
    console.log("[Moderation] unblockDomain", { domain, removed: rows.length });
    return { domain, removed: rows.length > 0 };
  },
});

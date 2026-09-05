import { v } from "convex/values";
import { doc } from "convex-helpers/validators";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import schema from "./schema";
import { queueServiceSync } from "./serviceSync";

type DomainTarget = {
  hostname: string;
  domainId?: Id<"custom_domains">;
  hostnameId?: string;
};

export async function queueDomainSync(
  ctx: MutationCtx,
  domain: Doc<"custom_domains">,
): Promise<number> {
  return queueServiceSync(ctx, `domain:${domain.domain}`, {
    kind: "domain",
    hostname: domain.domain,
    domainId: domain._id,
    hostnameId: domain.cloudflareHostnameId,
  });
}

export const requestDomainSync = internalMutation({
  args: { domainId: v.id("custom_domains") },
  returns: v.null(),
  handler: async (ctx, { domainId }) => {
    const domain = await ctx.db.get(domainId);
    if (domain) await queueDomainSync(ctx, domain);
    return null;
  },
});

export const getDesiredDomain = internalQuery({
  args: { hostname: v.string() },
  returns: v.union(doc(schema, "custom_domains"), v.null()),
  handler: async (ctx, { hostname }) =>
    ctx.db
      .query("custom_domains")
      .withIndex("by_domain", (q) => q.eq("domain", hostname))
      .unique(),
});

export const saveDomainStatus = internalMutation({
  args: {
    domainId: v.id("custom_domains"),
    hostname: v.string(),
    hostnameId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("failed"),
    ),
    sslStatus: v.string(),
    verificationTxtName: v.optional(v.string()),
    verificationTxtValue: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    // Deletion/replacement owns a newer job. Never attach an old result to a new row.
    if (!domain || domain.domain !== args.hostname) return false;
    await ctx.db.patch(domain._id, {
      cloudflareHostnameId: args.hostnameId,
      status: args.status,
      sslStatus: args.sslStatus,
      verificationTxtName: args.verificationTxtName,
      verificationTxtValue: args.verificationTxtValue,
      verifiedAt:
        args.status === "active"
          ? (domain.verifiedAt ?? Date.now())
          : undefined,
    });
    return true;
  },
});

export const queuePendingDomainPage = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.number(),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("custom_domains")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .paginate({ cursor, numItems: 50 });
    for (const domain of result.page) {
      const job = await ctx.db
        .query("serviceSyncJobs")
        .withIndex("by_key", (q) => q.eq("key", `domain:${domain.domain}`))
        .unique();
      // The reconciler owns failed/running work. A status poll must not reset its backoff.
      if (!job || job.status === "complete") await queueDomainSync(ctx, domain);
    }
    if (!result.isDone)
      await ctx.scheduler.runAfter(
        0,
        internal.domainSync.queuePendingDomainPage,
        { cursor: result.continueCursor },
      );
    return result.page.length;
  },
});

/** Adopt existing active/failed rows without resetting delivery attempts or backoff. */
export const bootstrapDomains = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  returns: v.number(),
  handler: async (ctx, { cursor }) => {
    const result = await ctx.db
      .query("custom_domains")
      .paginate({ cursor, numItems: 50 });
    for (const domain of result.page) {
      const job = await ctx.db
        .query("serviceSyncJobs")
        .withIndex("by_key", (q) => q.eq("key", `domain:${domain.domain}`))
        .unique();
      if (!job) await queueDomainSync(ctx, domain);
    }
    if (!result.isDone)
      await ctx.scheduler.runAfter(0, internal.domainSync.bootstrapDomains, {
        cursor: result.continueCursor,
      });
    return result.page.length;
  },
});

type Hostname = {
  id: string;
  hostname: string;
  status: string;
  sslStatus: string;
  verificationTxtName?: string;
  verificationTxtValue?: string;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readHostname(value: unknown): Hostname {
  if (
    !isObject(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.hostname !== "string" ||
    !value.hostname
  ) {
    throw new Error("Cloudflare returned an invalid domain record");
  }
  const ssl = isObject(value.ssl) ? value.ssl : {};
  const verification = isObject(value.ownership_verification)
    ? value.ownership_verification
    : {};
  return {
    id: value.id,
    hostname: value.hostname.toLowerCase(),
    status: typeof value.status === "string" ? value.status : "unknown",
    sslStatus: typeof ssl.status === "string" ? ssl.status : "unknown",
    verificationTxtName:
      typeof verification.name === "string" ? verification.name : undefined,
    verificationTxtValue:
      typeof verification.value === "string" ? verification.value : undefined,
  };
}

const MISSING_HOSTNAME = Symbol("missing hostname");

async function callCloudflare(
  path: string,
  options: RequestInit = {},
  allowMissing = false,
): Promise<unknown> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!apiToken || !zoneId)
    throw new Error("Cloudflare domain credentials are not configured");
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/custom_hostnames${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (allowMissing && response.status === 404) return MISSING_HOSTNAME;
  if (!response.ok)
    throw new Error(
      `Cloudflare domain request failed (HTTP ${response.status})`,
    );
  const body: unknown = await response.json();
  if (!isObject(body) || body.success !== true || !("result" in body)) {
    throw new Error("Cloudflare did not confirm the domain request");
  }
  return body.result;
}

async function findHostname(hostname: string): Promise<Hostname | null> {
  // The explicit exact filter prevents a prefix/substring match from becoming a grant.
  // https://developers.cloudflare.com/api/resources/custom_hostnames/methods/list/
  const query = new URLSearchParams({
    "hostname.exact": hostname,
    per_page: "50",
  });
  const result = await callCloudflare(`?${query}`);
  if (!Array.isArray(result))
    throw new Error("Cloudflare returned an invalid domain list");
  const matches = result
    .map(readHostname)
    .filter((item) => item.hostname === hostname);
  if (matches.length > 1)
    throw new Error("Cloudflare returned more than one matching domain");
  // An ignored filter must not be mistaken for a successful empty lookup.
  if (result.length !== matches.length)
    throw new Error("Cloudflare returned a different domain");
  return matches[0] ?? null;
}

async function getHostname(hostnameId: string): Promise<Hostname | null> {
  const result = await callCloudflare(
    `/${encodeURIComponent(hostnameId)}`,
    {},
    true,
  );
  if (result === MISSING_HOSTNAME) return null;
  const hostname = readHostname(result);
  if (hostname.id !== hostnameId)
    throw new Error("Cloudflare returned a different domain ID");
  return hostname;
}

function domainStatus(hostname: Hostname): "active" | "pending" | "failed" {
  if (hostname.status === "active" && hostname.sslStatus === "active")
    return "active";
  if (
    ["deleted", "blocked", "moved"].includes(hostname.status) ||
    ["deleted", "expired", "deactivated", "inactive"].includes(
      hostname.sslStatus,
    )
  )
    return "failed";
  return "pending";
}

/** Called only by the durable worker, which serializes all generations of a hostname. */
export async function deliverDomainChange(
  ctx: ActionCtx,
  target: DomainTarget,
): Promise<void> {
  const desired = await ctx.runQuery(internal.domainSync.getDesiredDomain, {
    hostname: target.hostname,
  });
  if (desired) {
    // Recover a successful create whose response or database update was lost.
    let hostname = await findHostname(target.hostname);
    if (!hostname) {
      hostname = readHostname(
        await callCloudflare("", {
          method: "POST",
          body: JSON.stringify({
            hostname: target.hostname,
            ssl: {
              method: "http",
              type: "dv",
              settings: { min_tls_version: "1.2" },
            },
          }),
        }),
      );
      if (hostname.hostname !== target.hostname)
        throw new Error("Cloudflare created a different domain");
    }
    await ctx.runMutation(internal.domainSync.saveDomainStatus, {
      domainId: desired._id,
      hostname: target.hostname,
      hostnameId: hostname.id,
      status: domainStatus(hostname),
      sslStatus: hostname.sslStatus,
      verificationTxtName: hostname.verificationTxtName,
      verificationTxtValue: hostname.verificationTxtValue,
    });
    return;
  }

  const hostname = target.hostnameId
    ? await getHostname(target.hostnameId)
    : await findHostname(target.hostname);
  if (!hostname) return;
  if (hostname.hostname !== target.hostname)
    throw new Error("Cloudflare deletion did not match the requested domain");
  // A user may re-add the hostname while this worker is reading Cloudflare.
  if (
    await ctx.runQuery(internal.domainSync.getDesiredDomain, {
      hostname: target.hostname,
    })
  )
    return;
  const deleted = await callCloudflare(
    `/${encodeURIComponent(hostname.id)}`,
    { method: "DELETE" },
    true,
  );
  if (
    deleted !== MISSING_HOSTNAME &&
    (!isObject(deleted) || deleted.id !== hostname.id)
  ) {
    throw new Error("Cloudflare did not confirm the requested domain deletion");
  }
}

/** Legacy tasks only saved an ID. Resolve it durably, then join the hostname queue. */
export async function deliverLegacyDomainDeletion(
  ctx: ActionCtx,
  hostnameId: string,
): Promise<void> {
  const hostname = await getHostname(hostnameId);
  if (!hostname) return;
  await ctx.runMutation(internal.serviceSync.enqueue, {
    key: `domain:${hostname.hostname}`,
    target: { kind: "domain", hostname: hostname.hostname, hostnameId },
  });
}

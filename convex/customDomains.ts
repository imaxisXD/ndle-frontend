import { v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_DOMAINS_FREE = 0;
const MAX_DOMAINS_PRO = 3;

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

/**
 * Get the domain limit for a user based on their membership
 */
function getDomainLimit(membership: string): number {
  switch (membership) {
    case "pro":
      return MAX_DOMAINS_PRO;
    default:
      return MAX_DOMAINS_FREE;
  }
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
      .collect();

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
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return domains.map((d) => ({
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
  }),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return { used: 0, limit: 0, canAddMore: false, isPro: false };
    }

    const domains = await ctx.db
      .query("custom_domains")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const limit = getDomainLimit(user.membership);
    const used = domains.length;

    return {
      used,
      limit,
      canAddMore: used < limit,
      isPro: user.membership === "pro",
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

    // Check if Pro user
    if (user.membership !== "pro") {
      return {
        success: false,
        error: "Custom domains require a Pro subscription",
      };
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

    if (existingDomain) {
      return {
        success: false,
        error: "This domain is already registered",
      };
    }

    // Check domain limit
    const userDomains = await ctx.db
      .query("custom_domains")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const limit = getDomainLimit(user.membership);
    if (userDomains.length >= limit) {
      return {
        success: false,
        error: `Pro plan allows up to ${limit} custom domains`,
      };
    }

    // Create the domain record with pending status
    const domainId = await ctx.db.insert("custom_domains", {
      userId: user._id,
      domain,
      status: "pending",
      createdAt: Date.now(),
    });

    // Schedule Cloudflare registration
    await ctx.scheduler.runAfter(
      0,
      internal.customDomains.internalRegisterWithCloudflare,
      { domainId },
    );

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

    // Schedule Cloudflare deletion if we have a hostname ID
    if (domain.cloudflareHostnameId) {
      console.log("Scheduling Cloudflare deletion");
      await ctx.scheduler.runAfter(
        0,
        internal.customDomains.internalDeleteFromCloudflare,
        { cloudflareHostnameId: domain.cloudflareHostnameId },
      );
    }

    // Delete the domain from database
    console.log("Deleting domain from database");
    await ctx.db.delete(args.domainId);

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

    // If no cloudflareHostnameId, schedule registration first
    if (!domain.cloudflareHostnameId) {
      await ctx.scheduler.runAfter(
        0,
        internal.customDomains.internalRegisterWithCloudflare,
        { domainId: args.domainId },
      );
      return { success: true };
    }

    // Schedule verification
    await ctx.scheduler.runAfter(
      0,
      internal.customDomains.internalVerifyDomainStatus,
      { domainId: args.domainId },
    );

    return { success: true };
  },
});

/**
 * Update domain status (called after Cloudflare API verification)
 */
export const updateDomainStatus = mutation({
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

    const updates: {
      status: "pending" | "active" | "failed";
      cloudflareHostnameId?: string;
      sslStatus?: string;
      verificationTxtName?: string;
      verificationTxtValue?: string;
      verifiedAt?: number;
    } = {
      status: args.status,
    };

    if (args.cloudflareHostnameId) {
      updates.cloudflareHostnameId = args.cloudflareHostnameId;
    }
    if (args.sslStatus) {
      updates.sslStatus = args.sslStatus;
    }
    if (args.verificationTxtName) {
      updates.verificationTxtName = args.verificationTxtName;
    }
    if (args.verificationTxtValue) {
      updates.verificationTxtValue = args.verificationTxtValue;
    }
    if (args.status === "active") {
      updates.verifiedAt = Date.now();
    }

    await ctx.db.patch(args.domainId, updates);

    return { success: true };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (for actions to call)
// ============================================================================

/**
 * Internal mutation to update domain after Cloudflare API call
 */
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
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (!domain) {
      throw new Error("Domain not found");
    }

    const updates: {
      status: "pending" | "active" | "failed";
      cloudflareHostnameId?: string;
      sslStatus?: string;
      verificationTxtName?: string;
      verificationTxtValue?: string;
      verifiedAt?: number;
    } = {
      status: args.status,
    };

    if (args.cloudflareHostnameId) {
      updates.cloudflareHostnameId = args.cloudflareHostnameId;
    }
    if (args.sslStatus) {
      updates.sslStatus = args.sslStatus;
    }
    if (args.verificationTxtName) {
      updates.verificationTxtName = args.verificationTxtName;
    }
    if (args.verificationTxtValue) {
      updates.verificationTxtValue = args.verificationTxtValue;
    }
    if (args.status === "active") {
      updates.verifiedAt = Date.now();
    }

    await ctx.db.patch(args.domainId, updates);
  },
});

/**
 * Internal mutation to delete domain (for actions to call)
 */
export const internalDeleteDomain = internalMutation({
  args: {
    domainId: v.id("custom_domains"),
  },
  handler: async (ctx, args) => {
    const domain = await ctx.db.get(args.domainId);
    if (!domain) {
      throw new Error("Domain not found");
    }
    await ctx.db.delete(args.domainId);
  },
});

/**
 * Internal action to delete hostname from Cloudflare (scheduled by mutation)
 */
export const internalDeleteFromCloudflare = internalAction({
  args: { cloudflareHostnameId: v.string() },
  handler: async (_ctx, args) => {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    console.log(
      "[internalDeleteFromCloudflare] Deleting hostname:",
      args.cloudflareHostnameId,
    );
    if (!apiToken || !zoneId) {
      console.log(
        "[internalDeleteFromCloudflare] No Cloudflare credentials, skipping",
      );
      return;
    }

    console.log(
      "[internalDeleteFromCloudflare] Deleting hostname:",
      args.cloudflareHostnameId,
    );

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${args.cloudflareHostnameId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        console.error(
          "[internalDeleteFromCloudflare] Cloudflare API error:",
          data,
        );
      } else {
        console.log(
          "[internalDeleteFromCloudflare] Successfully deleted from Cloudflare",
        );
      }
    } catch (error) {
      console.error("[internalDeleteFromCloudflare] Error:", error);
    }
  },
});

/**
 * Internal action to register domain with Cloudflare (scheduled by addDomain mutation)
 */
export const internalRegisterWithCloudflare = internalAction({
  args: { domainId: v.id("custom_domains") },
  handler: async (ctx, args) => {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    console.log(
      "[internalRegisterWithCloudflare] Starting registration for domain:",
      args.domainId,
    );

    if (!apiToken || !zoneId) {
      console.warn(
        "[internalRegisterWithCloudflare] Missing Cloudflare credentials - operating in manual mode",
      );
      return;
    }

    // Get the domain details
    const domainResult = (await ctx.runQuery(
      internal.customDomains.getDomainById,
      { domainId: args.domainId },
    )) as {
      _id: string;
      domain: string;
      status: string;
      cloudflareHostnameId?: string;
    } | null;

    if (!domainResult) {
      console.error(
        "[internalRegisterWithCloudflare] Domain not found in database",
      );
      return;
    }

    console.log(
      "[internalRegisterWithCloudflare] Registering domain:",
      domainResult.domain,
    );

    try {
      const requestBody = {
        hostname: domainResult.domain,
        ssl: {
          method: "http",
          type: "dv",
          settings: {
            min_tls_version: "1.2",
          },
        },
      };

      const response: Response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      const data = (await response.json()) as {
        success: boolean;
        errors?: { message: string; code?: number }[];
        result?: { id: string; ssl?: { status: string } };
      };

      if (!response.ok || !data.success) {
        const errorMsg: string =
          data.errors?.[0]?.message || "Failed to create custom hostname";
        console.error(
          "[internalRegisterWithCloudflare] Cloudflare API error:",
          errorMsg,
        );
        return;
      }

      console.log(
        "[internalRegisterWithCloudflare] SUCCESS! Hostname ID:",
        data.result?.id,
      );

      // Update domain with Cloudflare hostname ID
      await ctx.runMutation(internal.customDomains.internalUpdateDomain, {
        domainId: args.domainId,
        status: "pending" as const,
        cloudflareHostnameId: data.result?.id,
        sslStatus: data.result?.ssl?.status || "pending",
      });
    } catch (error) {
      console.error("[internalRegisterWithCloudflare] Exception:", error);
    }
  },
});

/**
 * Internal action to verify domain status with Cloudflare (scheduled by verifyDomain mutation)
 */
export const internalVerifyDomainStatus = internalAction({
  args: { domainId: v.id("custom_domains") },
  handler: async (ctx, args) => {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!apiToken || !zoneId) {
      console.warn(
        "[internalVerifyDomainStatus] Missing Cloudflare credentials",
      );
      return;
    }

    const domainResult = (await ctx.runQuery(
      internal.customDomains.getDomainById,
      { domainId: args.domainId },
    )) as {
      _id: string;
      domain: string;
      status: string;
      cloudflareHostnameId?: string;
    } | null;

    if (!domainResult) {
      console.error("[internalVerifyDomainStatus] Domain not found");
      return;
    }

    if (!domainResult.cloudflareHostnameId) {
      console.log(
        "[internalVerifyDomainStatus] Domain not registered with Cloudflare yet",
      );
      return;
    }

    try {
      const response: Response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${domainResult.cloudflareHostnameId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = (await response.json()) as {
        success: boolean;
        errors?: { message: string }[];
        result?: { ssl?: { status: string } };
      };

      if (!response.ok || !data.success) {
        console.error(
          "[internalVerifyDomainStatus] Cloudflare API error:",
          data,
        );
        return;
      }

      const sslStatus: string = data.result?.ssl?.status || "unknown";
      let newStatus: "pending" | "active" | "failed" = "pending";

      if (sslStatus === "active") {
        newStatus = "active";
      } else if (
        sslStatus === "deleted" ||
        sslStatus === "expired" ||
        sslStatus === "deactivated"
      ) {
        newStatus = "failed";
      }

      await ctx.runMutation(internal.customDomains.internalUpdateDomain, {
        domainId: args.domainId,
        status: newStatus,
        sslStatus: sslStatus,
      });

      console.log(
        `[internalVerifyDomainStatus] Domain ${domainResult.domain} status: ${newStatus}, SSL: ${sslStatus}`,
      );
    } catch (error) {
      console.error("[internalVerifyDomainStatus] Error:", error);
    }
  },
});

// ============================================================================
// ACTIONS (for Cloudflare API calls)
// ============================================================================

/**
 * Register a domain with Cloudflare for Platforms.
 * Creates a custom hostname in Cloudflare and updates the domain record.
 */
export const registerWithCloudflare = action({
  args: { domainId: v.id("custom_domains") },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // Get environment variables
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    console.log(
      "[registerWithCloudflare] Starting registration for domain:",
      args.domainId,
    );
    console.log("[registerWithCloudflare] API Token present:", !!apiToken);
    console.log("[registerWithCloudflare] Zone ID present:", !!zoneId);

    if (!apiToken || !zoneId) {
      console.warn(
        "[registerWithCloudflare] Missing Cloudflare credentials - operating in manual mode",
      );
      return { success: true };
    }

    // Get the domain details - using type assertion since we control the query
    const domainResult = (await ctx.runQuery(
      internal.customDomains.getDomainById,
      {
        domainId: args.domainId,
      },
    )) as {
      _id: string;
      domain: string;
      status: string;
      cloudflareHostnameId?: string;
    } | null;

    if (!domainResult) {
      console.error("[registerWithCloudflare] Domain not found in database");
      return { success: false, error: "Domain not found" };
    }

    console.log(
      "[registerWithCloudflare] Registering domain:",
      domainResult.domain,
    );
    console.log("[registerWithCloudflare] Making API call to Cloudflare...");

    try {
      // Create custom hostname in Cloudflare
      const requestBody = {
        hostname: domainResult.domain,
        ssl: {
          method: "http",
          type: "dv",
          settings: {
            min_tls_version: "1.2",
          },
        },
      };
      console.log(
        "[registerWithCloudflare] Request body:",
        JSON.stringify(requestBody),
      );

      const response: Response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      console.log("[registerWithCloudflare] Response status:", response.status);

      const data = (await response.json()) as {
        success: boolean;
        errors?: { message: string; code?: number }[];
        result?: { id: string; ssl?: { status: string } };
      };

      console.log(
        "[registerWithCloudflare] Response data:",
        JSON.stringify(data, null, 2),
      );

      if (!response.ok || !data.success) {
        const errorMsg: string =
          data.errors?.[0]?.message || "Failed to create custom hostname";
        console.error(
          "[registerWithCloudflare] Cloudflare API error:",
          errorMsg,
        );
        console.error(
          "[registerWithCloudflare] Full error response:",
          JSON.stringify(data.errors),
        );
        return { success: false, error: errorMsg };
      }

      console.log(
        "[registerWithCloudflare] SUCCESS! Hostname ID:",
        data.result?.id,
      );
      console.log(
        "[registerWithCloudflare] SSL Status:",
        data.result?.ssl?.status,
      );

      // Update domain with Cloudflare hostname ID
      await ctx.runMutation(internal.customDomains.internalUpdateDomain, {
        domainId: args.domainId,
        status: "pending" as const,
        cloudflareHostnameId: data.result?.id,
        sslStatus: data.result?.ssl?.status || "pending",
      });

      console.log("[registerWithCloudflare] Domain updated in database");
      return { success: true };
    } catch (error) {
      console.error("[registerWithCloudflare] Exception:", error);
      console.error("[registerWithCloudflare] Error:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Verify domain status with Cloudflare.
 * Checks the custom hostname status and updates the domain record.
 */
export const verifyDomainStatus = action({
  args: { domainId: v.id("custom_domains") },
  returns: v.object({
    success: v.boolean(),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("active"), v.literal("failed")),
    ),
    sslStatus: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    status?: "pending" | "active" | "failed";
    sslStatus?: string;
    error?: string;
  }> => {
    // Get environment variables
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!apiToken || !zoneId) {
      console.warn("[verifyDomainStatus] Missing Cloudflare credentials");
      return { success: false, error: "Cloudflare integration not configured" };
    }

    // Get the domain details - using type assertion since we control the query
    const domainResult = (await ctx.runQuery(
      internal.customDomains.getDomainById,
      {
        domainId: args.domainId,
      },
    )) as {
      _id: string;
      domain: string;
      status: string;
      cloudflareHostnameId?: string;
    } | null;

    if (!domainResult) {
      return { success: false, error: "Domain not found" };
    }

    if (!domainResult.cloudflareHostnameId) {
      return {
        success: false,
        error: "Domain not registered with Cloudflare yet",
      };
    }

    try {
      // Get custom hostname status from Cloudflare
      const response: Response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${domainResult.cloudflareHostnameId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const data = (await response.json()) as {
        success: boolean;
        errors?: { message: string }[];
        result?: { ssl?: { status: string } };
      };

      if (!response.ok || !data.success) {
        const errorMsg: string =
          data.errors?.[0]?.message || "Failed to get status";
        console.error("[verifyDomainStatus] Cloudflare API error:", data);
        return { success: false, error: errorMsg };
      }

      // Determine status based on SSL status
      const sslStatus: string = data.result?.ssl?.status || "unknown";
      let newStatus: "pending" | "active" | "failed" = "pending";

      if (sslStatus === "active") {
        newStatus = "active";
      } else if (
        sslStatus === "pending_validation" ||
        sslStatus === "pending_issuance" ||
        sslStatus === "initializing"
      ) {
        newStatus = "pending";
      } else if (
        sslStatus === "deleted" ||
        sslStatus === "expired" ||
        sslStatus === "deactivated"
      ) {
        newStatus = "failed";
      }

      // Update domain status
      await ctx.runMutation(internal.customDomains.internalUpdateDomain, {
        domainId: args.domainId,
        status: newStatus,
        sslStatus: sslStatus,
      });

      return { success: true, status: newStatus, sslStatus };
    } catch (error) {
      console.error("[verifyDomainStatus] Error:", error);
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Delete domain from Cloudflare when user deletes it.
 */
export const deleteFromCloudflare = action({
  args: { cloudflareHostnameId: v.string() },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!apiToken || !zoneId) {
      // No Cloudflare integration, nothing to delete
      return { success: true };
    }

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${args.cloudflareHostnameId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        console.error("[deleteFromCloudflare] Error:", data);
        // Don't fail - domain is already deleted from our DB
      }

      return { success: true };
    } catch (error) {
      console.error("[deleteFromCloudflare] Error:", error);
      return { success: true }; // Still return success - local delete worked
    }
  },
});

/**
 * Delete a custom domain with Cloudflare cleanup.
 * This action orchestrates both Cloudflare hostname deletion and database deletion.
 */
export const deleteDomainWithCloudflare = action({
  args: { domainId: v.id("custom_domains") },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    console.log(
      "[deleteDomainWithCloudflare] Starting deletion for domain:",
      args.domainId,
    );

    // Get the domain details to retrieve cloudflareHostnameId
    const domainResult = (await ctx.runQuery(
      internal.customDomains.getDomainById,
      {
        domainId: args.domainId,
      },
    )) as {
      _id: string;
      domain: string;
      status: string;
      cloudflareHostnameId?: string;
    } | null;

    if (!domainResult) {
      console.error(
        "[deleteDomainWithCloudflare] Domain not found in database",
      );
      return { success: false, error: "Domain not found" };
    }

    console.log(
      "[deleteDomainWithCloudflare] Found domain:",
      domainResult.domain,
    );

    // If we have a Cloudflare hostname ID, delete from Cloudflare first
    if (domainResult.cloudflareHostnameId) {
      console.log(
        "[deleteDomainWithCloudflare] Deleting from Cloudflare, hostname ID:",
        domainResult.cloudflareHostnameId,
      );

      const apiToken = process.env.CLOUDFLARE_API_TOKEN;
      const zoneId = process.env.CLOUDFLARE_ZONE_ID;

      if (apiToken && zoneId) {
        try {
          const response = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${domainResult.cloudflareHostnameId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!response.ok) {
            const data = await response.json();
            console.error(
              "[deleteDomainWithCloudflare] Cloudflare API error:",
              data,
            );
            // Continue with database deletion even if Cloudflare fails
          } else {
            console.log(
              "[deleteDomainWithCloudflare] Successfully deleted from Cloudflare",
            );
          }
        } catch (error) {
          console.error(
            "[deleteDomainWithCloudflare] Error calling Cloudflare API:",
            error,
          );
          // Continue with database deletion even if Cloudflare fails
        }
      } else {
        console.log(
          "[deleteDomainWithCloudflare] No Cloudflare credentials, skipping CF deletion",
        );
      }
    } else {
      console.log(
        "[deleteDomainWithCloudflare] No Cloudflare hostname ID, skipping CF deletion",
      );
    }

    // Delete from database
    try {
      await ctx.runMutation(internal.customDomains.internalDeleteDomain, {
        domainId: args.domainId,
      });
      console.log(
        "[deleteDomainWithCloudflare] Successfully deleted from database",
      );
      return { success: true };
    } catch (error) {
      console.error(
        "[deleteDomainWithCloudflare] Database deletion error:",
        error,
      );
      return { success: false, error: String(error) };
    }
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
 * Internal query to get all pending domains (for cron job)
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
      .collect();

    return domains.map((d) => ({
      _id: d._id,
      domain: d.domain,
      cloudflareHostnameId: d.cloudflareHostnameId,
    }));
  },
});

/**
 * Check all pending domains and update their status.
 * This is called by a cron job every 2 minutes.
 */
export const checkAllPendingDomains = internalAction({
  args: {},
  returns: v.object({
    checked: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx): Promise<{ checked: number; updated: number }> => {
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;

    if (!apiToken || !zoneId) {
      console.log(
        "[checkAllPendingDomains] No Cloudflare credentials, skipping",
      );
      return { checked: 0, updated: 0 };
    }

    // Get all pending domains
    const pendingDomains = await ctx.runQuery(
      internal.customDomains.getPendingDomains,
      {},
    );

    console.log(
      `[checkAllPendingDomains] Found ${pendingDomains.length} pending domains`,
    );

    let checked = 0;
    let updated = 0;

    for (const domain of pendingDomains) {
      if (!domain.cloudflareHostnameId) {
        console.log(
          `[checkAllPendingDomains] Domain ${domain.domain} not registered with CF, skipping`,
        );
        continue;
      }

      checked++;

      try {
        const response: Response = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames/${domain.cloudflareHostnameId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/json",
            },
          },
        );

        const data = (await response.json()) as {
          success: boolean;
          result?: { ssl?: { status: string } };
        };

        if (response.ok && data.success) {
          const sslStatus: string = data.result?.ssl?.status || "unknown";

          if (sslStatus === "active") {
            console.log(
              `[checkAllPendingDomains] Domain ${domain.domain} is now ACTIVE!`,
            );
            await ctx.runMutation(internal.customDomains.internalUpdateDomain, {
              domainId: domain._id,
              status: "active" as const,
              sslStatus: sslStatus,
            });
            updated++;
          } else if (
            sslStatus === "deleted" ||
            sslStatus === "expired" ||
            sslStatus === "deactivated"
          ) {
            console.log(
              `[checkAllPendingDomains] Domain ${domain.domain} FAILED: ${sslStatus}`,
            );
            await ctx.runMutation(internal.customDomains.internalUpdateDomain, {
              domainId: domain._id,
              status: "failed" as const,
              sslStatus: sslStatus,
            });
            updated++;
          } else {
            console.log(
              `[checkAllPendingDomains] Domain ${domain.domain} still pending: ${sslStatus}`,
            );
          }
        }
      } catch (error) {
        console.error(
          `[checkAllPendingDomains] Error checking ${domain.domain}:`,
          error,
        );
      }
    }

    console.log(
      `[checkAllPendingDomains] Checked ${checked}, updated ${updated}`,
    );
    return { checked, updated };
  },
});

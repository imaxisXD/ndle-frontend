import type { Id } from "./_generated/dataModel";
import type { RedisValueObject } from "./utils";

type RedirectProjectionInput = {
	fullUrl: string;
	docId: Id<"urls">;
	analyticsOwnerKey: string;
	convexUserId?: Id<"users">;
	trackingEnabled: boolean;
	expiresAt?: number;
	utmSource?: string;
	utmMedium?: string;
	utmCampaign?: string;
	utmTerm?: string;
	utmContent?: string;
	abEnabled?: boolean;
	abVariants?: Array<{
		id: string;
		url: string;
		weight: number;
	}>;
	abDistribution?: "weighted_random" | "deterministic";
};

function buildUtmParams(args: RedirectProjectionInput): Record<string, string> {
	const utmParams: Record<string, string> = {};
	if (args.utmSource) utmParams.utm_source = args.utmSource;
	if (args.utmMedium) utmParams.utm_medium = args.utmMedium;
	if (args.utmCampaign) utmParams.utm_campaign = args.utmCampaign;
	if (args.utmTerm) utmParams.utm_term = args.utmTerm;
	if (args.utmContent) utmParams.utm_content = args.utmContent;
	return utmParams;
}

function buildRedirectProjection(args: RedirectProjectionInput): RedisValueObject {
	const abTestConfig =
		args.abEnabled && args.abVariants?.length
			? {
					enabled: true,
					variants: args.abVariants,
					distribution: args.abDistribution ?? ("deterministic" as const),
				}
			: undefined;
	const now = Date.now();

	return {
		destination: args.fullUrl,
		user_id: args.analyticsOwnerKey,
		analytics_owner_key: args.analyticsOwnerKey,
		convex_user_id: args.convexUserId,
		tenant_id: args.convexUserId ?? args.analyticsOwnerKey,
		redirect_type: 302,
		created_at: now,
		updated_at: now,
		link_id: args.docId,
		is_active: true,
		expires_at: args.expiresAt ?? null,
		max_clicks: null,
		tags: [],
		utm_params: buildUtmParams(args),
		rules: {
			...(abTestConfig && { ab_test: abTestConfig }),
		},
		features: {
			track_clicks: args.trackingEnabled,
			track_conversions: args.trackingEnabled,
		},
		custom_metadata: {},
		version: 1,
	};
}

export { buildRedirectProjection };

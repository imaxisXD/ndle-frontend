import { z } from "zod";
import { ANALYTICS_RANGES, getUtcRange, type AnalyticsRange } from "@/lib/analyticsRanges";
import { getRangeAccessError } from "@/lib/analytics-access";
import { forwardExcludeBots } from "@/lib/analytics-bots";
import { createAnalyticsHandler } from "@/lib/analytics-route";

const schema = z.object({
  range: z.enum(ANALYTICS_RANGES).default("7d"),
  link_id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
  endpoint: z.enum(["performance", "timeseries"]).default("performance"),
});

export const GET = createAnalyticsHandler({
  routeName: "variants",
  errorLabel: "variants",
  backendErrorMessage: "Failed to fetch variant data",
  parseParams(request) {
    const { searchParams } = request.nextUrl;
    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      link_id: searchParams.get("link_id") ?? undefined,
      endpoint: searchParams.get("endpoint") ?? undefined,
    });
    return parsed.success
      ? { ok: true, data: parsed.data }
      : { ok: false, error: "Invalid params" };
  },
  checkAccess(params, viewer) {
    return getRangeAccessError(params.range, viewer.plan);
  },
  buildBackendUrl(params, request, baseUrl) {
    const { start, end } = getUtcRange(params.range as AnalyticsRange);
    let path = `/analytics/v2/variants/${encodeURIComponent(params.link_id)}`;
    if (params.endpoint === "timeseries") {
      path += "/timeseries";
    }
    const target = new URL(`${baseUrl}${path}`);
    forwardExcludeBots(request.nextUrl.searchParams, target);
    target.searchParams.set("start", start.toISOString().split("T")[0]);
    target.searchParams.set("end", end.toISOString().split("T")[0]);
    return target;
  },
});

import { z } from "zod";
import { ANALYTICS_RANGES, getUtcRange, type AnalyticsRange } from "@/lib/analyticsRanges";
import { getRangeAccessError } from "@/lib/analytics-access";
import { normalizeAnalyticsTimeseries } from "@/lib/analytics-response";
import { getLocalDayRange, isValidTimeZone } from "@/lib/local-dates";
import { forwardExcludeBots } from "@/lib/analytics-bots";
import { createAnalyticsHandler } from "@/lib/analytics-route";

const schema = z.object({
  range: z.enum(ANALYTICS_RANGES).default("7d"),
  link_slug: z.string().min(1).max(128).optional(),
  tz: z.string().max(64).optional(),
});

export const GET = createAnalyticsHandler({
  routeName: "timeseries",
  errorLabel: "timeseries",
  backendErrorMessage: "Failed to fetch analytics data",
  parseParams(request) {
    const { searchParams } = request.nextUrl;
    const parsed = schema.safeParse({
      range: searchParams.get("range") ?? undefined,
      link_slug: searchParams.get("link_slug") ?? undefined,
      tz: searchParams.get("tz") ?? undefined,
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
    const target = new URL(`${baseUrl}/analytics/unified`);
    forwardExcludeBots(request.nextUrl.searchParams, target);
    target.searchParams.set("endpoint", "timeseries");
    target.searchParams.set("start", start.toISOString().split("T")[0]);
    target.searchParams.set("end", end.toISOString().split("T")[0]);
    if (params.link_slug) {
      target.searchParams.set("link_slug", params.link_slug);
    }
    if (isValidTimeZone(params.tz)) {
      const local = getLocalDayRange(params.range as AnalyticsRange, params.tz);
      target.searchParams.set("tz", params.tz);
      target.searchParams.set("local_start", local.start);
      target.searchParams.set("local_end", local.end);
    }
    return target;
  },
  transformResponse(payload) {
    const result = payload as Record<string, unknown>;
    return {
      ...result,
      data: normalizeAnalyticsTimeseries(result.data),
      granularity: "day",
    };
  },
});

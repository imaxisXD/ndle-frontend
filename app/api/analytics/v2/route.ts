import { z } from "zod";
import { getDateWindowAccessError } from "@/lib/analytics-access";
import { createAnalyticsHandler } from "@/lib/analytics-route";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  });

const inputSchema = z
  .object({
    start: dateSchema,
    end: dateSchema,
    country: z.string().max(200).optional(),
    device: z.string().max(200).optional(),
    browser: z.string().max(200).optional(),
    os: z.string().max(200).optional(),
    link: z.string().max(2048).optional(),
    includeFiles: z.enum(["true", "false"]).optional(),
    excludeBots: z.enum(["true", "false"]).optional(),
  })
  .refine((value) => value.start <= value.end);

export const GET = createAnalyticsHandler({
  routeName: "v2",
  errorLabel: "v2",
  backendErrorMessage: "Analytics could not load. Try again shortly.",
  timeoutMs: 20_000,
  parseParams(request) {
    const parsed = inputSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return {
        ok: false,
        error: "Invalid analytics filters or date range",
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    const data = {
      ...parsed.data,
      end: parsed.data.end > today ? today : parsed.data.end,
    };
    if (data.start > data.end) {
      return { ok: false, error: "Invalid date range" };
    }
    return { ok: true, data };
  },
  checkAccess(params, viewer) {
    const rangeError = getDateWindowAccessError(
      params.start,
      params.end,
      viewer.plan,
    );
    if (rangeError) return rangeError;
    if (params.includeFiles === "true" && viewer.plan !== "pro") {
      return "Archived analytics files require a Pro plan.";
    }
    return null;
  },
  buildBackendUrl(params, _request, baseUrl) {
    const target = new URL(`${baseUrl}/analytics/v2`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "all") {
        target.searchParams.set(key, value);
      }
    }
    return target;
  },
});

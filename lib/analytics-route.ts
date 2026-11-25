import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ANALYTICS_PLAN_REQUIRED } from "@/lib/analytics-access";
import { getAnalyticsRateLimit } from "@/lib/rateLimit";
import {
  ANALYTICS_READ_TIMEOUT_MS,
  getAnalyticsReadSecret,
  getSignedInAnalyticsViewer,
  type SignedInAnalyticsViewer,
} from "@/lib/server-analytics-plan";

export function getAnalyticsBaseUrl(): string {
  return (process.env.INTERNAL_API_URL || "")
    .replace(/\/analytics\/v2\/?$/, "")
    .replace(/\/$/, "");
}

export interface AnalyticsRouteConfig<TParams> {
  routeName: string;
  parseParams: (
    request: NextRequest,
  ) => { ok: true; data: TParams } | { ok: false; error: string };
  checkAccess: (
    params: TParams,
    viewer: SignedInAnalyticsViewer,
  ) => string | null;
  buildBackendUrl: (
    params: TParams,
    request: NextRequest,
    baseUrl: string,
  ) => URL;
  transformResponse?: (payload: unknown, params: TParams) => unknown;
  timeoutMs?: number;
  errorLabel: string;
  backendErrorMessage: string;
}

export function createAnalyticsHandler<TParams>(
  config: AnalyticsRouteConfig<TParams>,
) {
  return async function GET(request: NextRequest) {
    try {
      const { userId: clerkUserId, getToken } = await auth();
      if (!clerkUserId) {
        return NextResponse.json(
          { error: "Sign in to view analytics" },
          { status: 401 },
        );
      }

      const parsed = config.parseParams(request);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }

      const rate = await getAnalyticsRateLimit().limit(
        `analytics:${config.routeName}:${clerkUserId}`,
      );
      if (!rate.success) {
        return NextResponse.json(
          { error: "Too many requests. Try again shortly." },
          { status: 429 },
        );
      }

      const viewer = await getSignedInAnalyticsViewer(getToken);
      if (!viewer) {
        return NextResponse.json(
          { error: "Your account is getting ready. Try again shortly." },
          { status: 503 },
        );
      }

      const accessError = config.checkAccess(parsed.data, viewer);
      if (accessError) {
        return NextResponse.json(
          { error: accessError, code: ANALYTICS_PLAN_REQUIRED },
          { status: 403 },
        );
      }

      const baseUrl = getAnalyticsBaseUrl();
      const secret = getAnalyticsReadSecret();
      if (!baseUrl || !secret) {
        throw new Error("Analytics service is not configured");
      }

      const target = config.buildBackendUrl(parsed.data, request, baseUrl);
      const response = await fetch(target.toString(), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": viewer.userId,
          Authorization: `Bearer ${secret}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(
          config.timeoutMs ?? ANALYTICS_READ_TIMEOUT_MS,
        ),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: config.backendErrorMessage },
          { status: response.status >= 500 ? 503 : response.status },
        );
      }

      const payload: unknown = await response.json();
      const body = config.transformResponse
        ? config.transformResponse(payload, parsed.data)
        : payload;

      return NextResponse.json(body, {
        headers: { "Cache-Control": "private, no-store" },
      });
    } catch (error) {
      console.error(
        `[Analytics:${config.errorLabel}]`,
        error instanceof Error ? error.message : "Service error",
      );
      return NextResponse.json(
        { error: "Analytics is temporarily unavailable. Try again shortly." },
        { status: 503 },
      );
    }
  };
}

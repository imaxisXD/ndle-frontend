import { ANALYTICS_PLAN_REQUIRED } from "@/lib/analytics-access";

/** A failed analytics API request, keeping the status and the route's reason. */
export class AnalyticsRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "AnalyticsRequestError";
    this.status = status;
    this.code = code;
  }
}

/**
 * The error for a failed analytics API response, with the route's message or
 * `fallbackMessage`. Use as `if (!res.ok) throw await analyticsRequestError(...)`.
 */
export async function analyticsRequestError(
  response: Response,
  fallbackMessage: string,
): Promise<AnalyticsRequestError> {
  const body: unknown = await response.json().catch(() => null);
  const { error, code } = (
    typeof body === "object" && body !== null ? body : {}
  ) as { error?: unknown; code?: unknown };
  return new AnalyticsRequestError(
    typeof error === "string" && error ? error : fallbackMessage,
    response.status,
    typeof code === "string" ? code : undefined,
  );
}

/** The request was refused only because the viewer's plan does not include the range. */
export function isPlanRequiredError(error: unknown): boolean {
  return (
    error instanceof AnalyticsRequestError &&
    error.status === 403 &&
    error.code === ANALYTICS_PLAN_REQUIRED
  );
}

type AnalyticsQuery = {
  data: unknown;
  error: unknown;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
};

export type LinkAnalyticsStatus = "ready" | "plan-required" | "error";

/**
 * What the link page shows for its analytics requests. A request only counts
 * as failed while it has no data and is not being retried: a failed background
 * refresh keeps the last result on screen, and a retry shows as loading.
 */
export function getLinkAnalyticsState<Query extends AnalyticsQuery>(
  queries: readonly Query[],
  { rangeLocked = false }: { rangeLocked?: boolean } = {},
): { status: LinkAnalyticsStatus; failed: Query[]; isLoading: boolean } {
  if (rangeLocked)
    return { status: "plan-required", failed: [], isLoading: false };

  const withoutData = queries.filter(
    (query) => query.isError && query.data === undefined,
  );
  const failed = withoutData.filter((query) => !query.isFetching);
  if (failed.some((query) => isPlanRequiredError(query.error))) {
    return { status: "plan-required", failed, isLoading: false };
  }
  return {
    status: failed.length > 0 ? "error" : "ready",
    failed,
    isLoading:
      queries.some((query) => query.isLoading) ||
      withoutData.some((query) => query.isFetching),
  };
}

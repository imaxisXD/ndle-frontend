import type { AnalyticsViewerPlan } from "@/lib/analytics-access";

export type GetClerkToken = (options: {
  template?: "convex";
  skipCache?: boolean;
}) => Promise<string | null>;

export type SignedInAnalyticsViewer = {
  userId: string;
  plan: AnalyticsViewerPlan;
};

export const ANALYTICS_READ_TIMEOUT_MS = 10_000;

/** Ingest reads use their own scoped secret when configured. */
export function getAnalyticsReadSecret(): string | undefined {
  return process.env.ANALYTICS_READ_SECRET || process.env.API_SECRET;
}

/** Run an authenticated Convex query using the caller's Clerk JWT. */
export async function queryConvexAsUser<T>(
  getToken: GetClerkToken,
  path: string,
  args: Record<string, unknown> = {},
  timeoutMs = 5_000,
): Promise<T | null> {
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const stopped = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(new Error("Convex lookup timed out")),
      { once: true },
    );
  });
  try {
    const token = await Promise.race([getToken({ template: "convex" }), stopped]);
    if (!token) return null;
    const response = await fetch(`${convexUrl.replace(/\/$/, "")}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Convex-Client": "ndle-analytics-viewer",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        path,
        args,
        format: "json",
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const result = (await response.json()) as {
      status?: unknown;
      value?: T;
    };
    if (result.status !== "success") return null;
    return result.value ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve the account from the authenticated identity, without waiting for Clerk metadata sync. */
export async function getSignedInAnalyticsViewer(
  getToken: GetClerkToken,
): Promise<SignedInAnalyticsViewer | null> {
  const value = await queryConvexAsUser<{
    userId?: unknown;
    membership?: unknown;
  }>(getToken, "users:getViewerState");
  const userId = value?.userId;
  const plan = value?.membership;
  if (
    typeof userId !== "string" ||
    !userId ||
    userId.length > 256 ||
    !["free", "pro", "guest"].includes(String(plan))
  ) {
    return null;
  }
  return { userId, plan: plan as AnalyticsViewerPlan };
}

/** Compatibility for callers that only need the current plan. */
export async function getSignedInUserPlan(
  getToken: GetClerkToken,
): Promise<AnalyticsViewerPlan | null> {
  return (await getSignedInAnalyticsViewer(getToken))?.plan ?? null;
}

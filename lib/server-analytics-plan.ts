import type { AnalyticsViewerPlan } from "@/lib/analytics-access";

type GetClerkToken = (options: {
  template?: "convex";
  skipCache?: boolean;
}) => Promise<string | null>;
export type SignedInAnalyticsViewer = {
  userId: string;
  plan: AnalyticsViewerPlan;
};
export const ANALYTICS_READ_TIMEOUT_MS = 10_000;

/** Resolve the account from the authenticated identity, without waiting for Clerk metadata sync. */
export async function getSignedInAnalyticsViewer(
  getToken: GetClerkToken,
): Promise<SignedInAnalyticsViewer | null> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  const stopped = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => reject(new Error("Account lookup timed out")),
      { once: true },
    );
  });
  try {
    const token = await Promise.race([
      getToken({ template: "convex" }),
      stopped,
    ]);
    if (!token) return null;
    const response = await fetch(`${convexUrl.replace(/\/$/, "")}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Convex-Client": "ndle-analytics-viewer",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        path: "users:getViewerState",
        args: {},
        format: "json",
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const result = (await response.json()) as {
      status?: unknown;
      value?: { userId?: unknown; membership?: unknown };
    };
    const userId = result.value?.userId;
    const plan = result.value?.membership;
    if (
      result.status !== "success" ||
      typeof userId !== "string" ||
      !userId ||
      userId.length > 256 ||
      !["free", "pro", "guest"].includes(String(plan))
    )
      return null;
    return { userId, plan: plan as AnalyticsViewerPlan };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Compatibility for callers that only need the current plan. */
export async function getSignedInUserPlan(
  getToken: GetClerkToken,
): Promise<AnalyticsViewerPlan | null> {
  return (await getSignedInAnalyticsViewer(getToken))?.plan ?? null;
}

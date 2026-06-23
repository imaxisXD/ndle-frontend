import type { AnalyticsViewerPlan } from "@/lib/analytics-access";

type GetClerkToken = (options: {
  template?: "convex";
  skipCache?: boolean;
}) => Promise<string | null>;

type ViewerStateResponse = {
  status: "success" | "error";
  value?: {
    membership?: unknown;
  };
  errorMessage?: string;
};

function parseViewerPlan(value: unknown): AnalyticsViewerPlan | null {
  return value === "free" || value === "pro" || value === "guest"
    ? value
    : null;
}

export async function getSignedInUserPlan(
  getToken: GetClerkToken,
): Promise<AnalyticsViewerPlan | null> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("[Analytics] Missing NEXT_PUBLIC_CONVEX_URL");
    return null;
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(`${convexUrl}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Convex-Client": "ndle-worker-plan-check",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        path: "users:getViewerState",
        args: {},
        format: "json",
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[Analytics] Failed to read user plan:", await response.text());
      return null;
    }

    const result = (await response.json()) as ViewerStateResponse;
    if (result.status !== "success") {
      console.error("[Analytics] Failed to read user plan:", result.errorMessage);
      return null;
    }

    return parseViewerPlan(result.value?.membership);
  } catch (error) {
    console.error("[Analytics] Failed to read user plan:", error);
    return null;
  }
}

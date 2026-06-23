import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { AnalyticsViewerPlan } from "@/lib/analytics-access";

type GetClerkToken = (options: {
  template?: "convex";
  skipCache?: boolean;
}) => Promise<string | null>;

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
    const convex = new ConvexHttpClient(convexUrl, { auth: token });
    const viewer = await convex.query(api.users.getViewerState);
    return viewer.membership;
  } catch (error) {
    console.error("[Analytics] Failed to read user plan:", error);
    return null;
  }
}

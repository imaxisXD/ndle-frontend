import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import StaticAppShell from "@/app/_app-shell/page";

// The signed-in app (the home page is app/page.tsx). Nothing here is for
// search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

const EXACT_APP_PATHS = new Set([
  "dashboard",
  "urls",
  "analytics",
  "monitoring",
  "settings",
  "collections",
]);

const DETAIL_APP_PREFIXES = new Set(["collection", "link"]);

function isKnownAppPath(segments: string[]): boolean {
  if (segments.length === 1) {
    return EXACT_APP_PATHS.has(segments[0]);
  }
  if (segments.length === 2) {
    return DETAIL_APP_PREFIXES.has(segments[0]) && segments[1].length > 0;
  }
  return false;
}

export default async function Page({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!isKnownAppPath(path)) {
    notFound();
  }

  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn();

  return <StaticAppShell />;
}

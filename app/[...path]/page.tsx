import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import StaticAppShell from "@/app/static-app-shell/page";

// The signed-in app (the home page is app/page.tsx). Nothing here is for
// search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function Page() {
  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn();

  return <StaticAppShell />;
}

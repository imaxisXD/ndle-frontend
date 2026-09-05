import { auth } from "@clerk/nextjs/server";
import StaticAppShell from "@/app/static-app-shell/page";
import { PublicHome } from "@/components/PublicHome";

export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { isAuthenticated, redirectToSignIn } = await auth();

  if (!isAuthenticated) {
    const { path } = await params;
    if (path?.length) return redirectToSignIn();
    return <PublicHome />;
  }

  return <StaticAppShell />;
}

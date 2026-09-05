import { auth } from "@clerk/nextjs/server";
import StaticAppShell from "@/app/static-app-shell/page";
import { PublicHome } from "@/components/PublicHome";

export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  if (!path?.length) return <PublicHome />;

  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn();

  return <StaticAppShell />;
}

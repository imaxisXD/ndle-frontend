import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import StaticAppShell from "@/app/static-app-shell/page";
import { PublicHome } from "@/components/PublicHome";

type Props = { params: Promise<{ path?: string[] }> };

// The home page is the only public page on this route. The app behind sign-in
// has nothing for search results.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { path } = await params;
  return path?.length ? { robots: { index: false, follow: false } } : { alternates: { canonical: "/" } };
}

export default async function Page({ params }: Props) {
  const { path } = await params;
  if (!path?.length) return <PublicHome />;

  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) return redirectToSignIn();

  return <StaticAppShell />;
}

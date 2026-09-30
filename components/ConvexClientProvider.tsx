"use client";

import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect, useState, type ReactNode } from "react";
import { releaseDuckDB } from "@/hooks/use-duckdb";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in your .env file");
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function AccountQueryCache({ children, account }: { children: ReactNode; account: string | null }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: {
    gcTime: 5 * 60_000, staleTime: 60_000, refetchOnWindowFocus: false,
  } } }));
  // Leaving an account drops everything fetched for it.
  useEffect(() => () => {
    void queryClient.cancelQueries();
    queryClient.clear();
  }, [queryClient]);
  useEffect(() => (account ? () => releaseDuckDB(account) : undefined), [account]);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function AccountBoundary({ children }: { children: ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const account = isLoaded ? userId ?? "guest" : null;
  // Changing accounts replaces the complete private query tree before it can render old data.
  // The first account a page load learns keeps the tree rendered while Clerk loaded: nothing
  // private runs before then (private queries and DuckDB wait for a signed-in user), and the
  // query cache is still new. Replacing it would remount the whole page on every load. Adjusted
  // during render, so the children never render with the wrong tree.
  const [seen, setSeen] = useState({ account, generation: 0 });
  if (account !== null && account !== seen.account) {
    setSeen({ account, generation: seen.account === null ? seen.generation : seen.generation + 1 });
  }
  return <AccountQueryCache key={seen.generation} account={account}>{children}</AccountQueryCache>;
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AccountBoundary>{children}</AccountBoundary>
    </ConvexProviderWithClerk>
  );
}

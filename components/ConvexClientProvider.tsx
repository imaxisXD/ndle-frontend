"use client";

import { useAuth } from "@clerk/nextjs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect, useState, type ReactNode } from "react";
import { releaseDuckDB } from "@/hooks/use-duckdb";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in your .env file");
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

function AccountQueryCache({ children, account }: { children: ReactNode; account: string }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: {
    gcTime: 5 * 60_000, staleTime: 60_000, refetchOnWindowFocus: false,
  } } }));
  useEffect(() => () => {
    void queryClient.cancelQueries();
    queryClient.clear();
    releaseDuckDB(account);
  }, [queryClient, account]);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function AccountBoundary({ children }: { children: ReactNode }) {
  const { userId, isLoaded } = useAuth();
  // Changing accounts replaces the complete private query tree before it can render old data.
  const account = isLoaded ? userId ?? "guest" : "loading";
  return <AccountQueryCache key={account} account={account}>{children}</AccountQueryCache>;
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <AccountBoundary>{children}</AccountBoundary>
    </ConvexProviderWithClerk>
  );
}

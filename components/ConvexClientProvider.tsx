"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in your .env file");
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// QueryClient with default cache settings for persistence
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // gcTime must be >= maxAge for the persister to work correctly
      gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days
      staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days - favicons rarely change
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Don't refetch on component mount if we have cached data
      refetchOnReconnect: false, // Don't refetch on network reconnect
    },
  },
});

// Create async persister for localStorage - only available on client side
const persister =
  typeof window !== "undefined"
    ? createAsyncStoragePersister({
        storage: window.localStorage,
        key: "NDLE_QUERY_CACHE",
        throttleTime: 2000, // Throttle saves to every 2 seconds to avoid spamming localStorage
      })
    : null;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  // During SSR or if persister is unavailable, we still render with the queryClient
  // PersistQueryClientProvider handles the null persister case gracefully
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: persister!,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        // Only persist favicon queries to avoid caching sensitive user data
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist queries with "favicon" as the first key and a valid URL
            return query.queryKey[0] === "favicon" && query.queryKey[1] != null;
          },
        },
      }}
    >
      <ClerkProvider>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </PersistQueryClientProvider>
  );
}

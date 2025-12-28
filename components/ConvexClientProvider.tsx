"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { QueryClient, hydrate } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import type { ReactNode } from "react";
import { DuckDBPrefetch } from "./DuckDBPrefetch";

if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in your .env file");
}

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Singleton QueryClient - created once and reused
let browserQueryClient: QueryClient | undefined = undefined;

// Synchronously restore cache from localStorage when creating QueryClient
// This prevents race condition where queries run before async persister loads
function hydrateFromLocalStorage(client: QueryClient) {
  if (typeof window === "undefined") return;

  try {
    const cached = window.localStorage.getItem("NDLE_QUERY_CACHE");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed?.clientState) {
        hydrate(client, parsed.clientState);
      }
    }
  } catch {
    // Silently fail - cache will be rebuilt
  }
}

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always create a new QueryClient
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute for SSR
        },
      },
    });
  }
  // Browser: use singleton
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          gcTime: 1000 * 60 * 60 * 24 * 30, // 30 days
          staleTime: Infinity, // Never stale - only fetch if no data
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: false,
        },
      },
    });
    // Immediately hydrate from localStorage to prevent race condition
    hydrateFromLocalStorage(browserQueryClient);
  }
  return browserQueryClient;
}

// Create persister - only on client
const persister =
  typeof window !== "undefined"
    ? createAsyncStoragePersister({
        storage: window.localStorage,
        key: "NDLE_QUERY_CACHE",
        throttleTime: 2000,
      })
    : null;

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: persister!,
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            return query.queryKey[0] === "favicon" && query.queryKey[1] != null;
          },
        },
      }}
    >
      <ClerkProvider>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <DuckDBPrefetch />
          {children}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </PersistQueryClientProvider>
  );
}

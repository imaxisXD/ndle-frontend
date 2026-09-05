"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function AppLoading() {
  return (
    <main className="bg-home text-foreground flex min-h-screen items-center justify-center px-6">
      <output className="text-muted-foreground text-sm">
        Loading your account…
      </output>
    </main>
  );
}

export function AppAccess({ children }: { children?: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();

  // Clerk refreshes the server page after sign-out. Hide private content while it does.
  if (!isLoaded || !isSignedIn || isLoading) {
    return <AppLoading />;
  }

  if (!isAuthenticated) {
    return (
      <main className="bg-home text-foreground flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div role="alert">
          <h1 className="text-base font-medium">Your account could not load</h1>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            You are signed in, but we could not connect to your account. Please
            try again.
          </p>
        </div>
        <Button type="button" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </main>
    );
  }

  return children;
}

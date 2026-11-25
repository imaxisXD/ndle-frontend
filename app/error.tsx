"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <main className="bg-surface-page text-foreground flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div role="alert">
        <h1 className="text-base font-medium">Something went wrong</h1>
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          An unexpected error interrupted this page. Your saved links and data are safe.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}

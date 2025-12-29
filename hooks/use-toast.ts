"use client";

import { useCallback } from "react";
import { Toast } from "@base-ui-components/react/toast";

// Create a global toast manager that can be passed to Toast.Provider
export const toastManager = Toast.createToastManager();

// Re-export the hook with a deferred add function
// This prevents the "flushSync was called from inside a lifecycle method" error
// by deferring toast additions to after React's current render cycle
export function useToast() {
  const manager = Toast.useToastManager();

  // Wrap add to defer it with setTimeout(0) to escape React's render cycle
  const add = useCallback(
    (options: Parameters<typeof manager.add>[0]) => {
      setTimeout(() => manager.add(options), 0);
      return "";
    },
    [manager],
  );

  return {
    ...manager,
    add,
  };
}

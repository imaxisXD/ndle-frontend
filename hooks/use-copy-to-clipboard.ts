"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Copy text to clipboard with auto-resetting `copied` state and unmount cleanup. */
export function useCopyToClipboard(resetDelayMs = 2000) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), resetDelayMs);
        return true;
      } catch (err) {
        console.error("Failed to copy:", err);
        return false;
      }
    },
    [resetDelayMs],
  );

  return { copied, copy };
}

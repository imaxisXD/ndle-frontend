"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  createReplayGuard,
  REPLAY_RECORDER_URL,
  type ReplayWindow,
} from "@/lib/session-replay";

let guard: ((pathname: string) => void) | undefined;

export function SessionReplayGuard() {
  const pathname = usePathname();
  useEffect(() => {
    guard ??= createReplayGuard(window as ReplayWindow, (callback) => {
      document
        .querySelector(`script[src="${REPLAY_RECORDER_URL}"]`)
        ?.addEventListener("load", callback, { once: true });
    });
    guard(pathname);
  }, [pathname]);
  return null;
}

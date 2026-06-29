"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Skeleton({ className, children }: SkeletonProps) {
  return (
    <div className={cn("h-lh animate-pulse rounded-sm bg-gray-200", className)}>
      {children}
    </div>
  );
}

interface SkeletonRevealProps {
  /** While true the pulsing skeleton shows; when it flips false the content
   *  cross-fades/cross-blurs in (transitions.dev skeleton-reveal). */
  loading: boolean;
  /** The pulsing placeholder. Put bars/avatars as DIRECT children so the
   *  pulse animation (which runs on `.t-skel-skeleton.is-pulsing > *`) hits them. */
  skeleton: React.ReactNode;
  /** The loaded content, revealed once `loading` flips false. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Cross-fade + cross-blur hand-off from a pulsing skeleton to loaded content.
 * Wraps the transitions.dev `.t-skel` pattern (classes + reduced-motion guard
 * live in app/globals.css). Skeleton + content stack in the same slot, so the
 * swap is layout-free.
 */
export function SkeletonReveal({
  loading,
  skeleton,
  children,
  className,
}: SkeletonRevealProps) {
  const skelRef = useRef<HTMLDivElement>(null);
  // Track whether we've already revealed so a flip back to `loading` snaps
  // the skeleton in without animating the reverse (reference's replay path).
  const revealedRef = useRef(false);

  useEffect(() => {
    const skel = skelRef.current;
    if (!skel) return;
    const skeletonEl = skel.querySelector<HTMLElement>(".t-skel-skeleton");

    if (!loading) {
      // Data arrived: reveal.
      skel.classList.add("is-revealed");
      revealedRef.current = true;
    } else if (revealedRef.current) {
      // Replaying the loading state: snap back without animating the reverse.
      skel.classList.add("is-resetting");
      skel.classList.remove("is-revealed");
      skeletonEl?.classList.remove("is-pulsing");
      // Force a reflow so the transition:none change takes effect instantly.
      void skel.offsetWidth;
      skel.classList.remove("is-resetting");
      skeletonEl?.classList.add("is-pulsing");
      revealedRef.current = false;
    }
  }, [loading]);

  return (
    <div ref={skelRef} className={cn("t-skel", className)}>
      <div className="t-skel-skeleton is-pulsing">{skeleton}</div>
      <div className="t-skel-content">{children}</div>
    </div>
  );
}

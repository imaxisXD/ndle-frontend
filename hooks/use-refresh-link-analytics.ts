import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

const INVALIDATION_DEBOUNCE_MS = 500;

/**
 * Convex updates a link's click count live, and only after the analytics
 * database has committed the same click. Debounce invalidations so bursts of
 * clicks on a viral link collapse into a single refetch.
 */
export function useRefreshLinkAnalytics({
  linkSlug,
  linkId,
  liveClickCount,
}: {
  linkSlug: string;
  linkId?: string;
  liveClickCount?: number;
}) {
  const queryClient = useQueryClient();
  const previous = useRef<number | undefined>(undefined);

  useEffect(() => {
    const before = previous.current;
    previous.current = liveClickCount;
    // The first value is the page load, not a new click.
    if (
      before === undefined ||
      liveClickCount === undefined ||
      liveClickCount <= before
    ) {
      return;
    }

    const timer = setTimeout(() => {
      void queryClient.invalidateQueries({
        predicate: ({ queryKey }) => {
          if (queryKey[0] === "analytics") {
            return (
              queryKey.includes(linkSlug) ||
              (linkId !== undefined && queryKey.includes(linkId))
            );
          }
          if (queryKey[0] === "analytics-v2") {
            const filters = queryKey[4] as { link?: string } | undefined;
            return filters?.link === linkSlug;
          }
          return false;
        },
      });
    }, INVALIDATION_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [queryClient, linkSlug, linkId, liveClickCount]);
}

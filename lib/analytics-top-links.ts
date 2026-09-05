interface AnalyticsLinkDetail {
  slugAssigned?: string;
  fullurl: string;
  customDomain?: string | null;
  _creationTime: number;
}

/** The analytics API can identify a link by its full short URL or its slug. */
export function getAnalyticsTopLinks(
  linkCounts: Record<string, number>,
  details: AnalyticsLinkDetail[] = [],
  limit = 5,
) {
  const countsBySlug = new Map<string, { clicks: number; recordedDomain?: string }>();
  for (const [identifier, clicks] of Object.entries(linkCounts)) {
    let slug = identifier.trim();
    let recordedDomain: string | undefined;
    if (/^https?:\/\//i.test(slug)) {
      try {
        const url = new URL(slug);
        slug = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, ""));
        recordedDomain = url.host;
      } catch {
        continue;
      }
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) continue;
    const previous = countsBySlug.get(slug);
    countsBySlug.set(slug, {
      clicks: (previous?.clicks ?? 0) + clicks,
      recordedDomain: previous?.recordedDomain ?? recordedDomain,
    });
  }

  return [...countsBySlug.entries()]
    .sort(([, left], [, right]) => right.clicks - left.clicks)
    .slice(0, limit)
    .map(([slug, { clicks, recordedDomain }]) => {
      const detail = details.find(link => link.slugAssigned === slug);
      return {
        url: slug,
        originalUrl: detail?.fullurl ?? "Deleted link",
        clicks,
        change: "",
        createdAt: detail?._creationTime ?? 0,
        customDomain: detail ? detail.customDomain : recordedDomain,
      };
    });
}

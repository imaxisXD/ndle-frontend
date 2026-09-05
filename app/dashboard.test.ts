// @vitest-environment node

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import HomeRoute from "@/routes/HomeRoute";
import { UrlTable } from "@/components/url-table/UrlTable";

const links = vi.hoisted(() => ({
  status: "Exhausted",
  results: Array.from({ length: 11 }, (_, index) => ({
    _id: `link-${index}`,
    _creationTime: Date.UTC(2026, 8, 1),
    fullurl: `https://example.com/${index}`,
    shortUrl: `https://ndle.im/link-${index}`,
  })),
}));

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  usePaginatedQuery: (_query: unknown, args: unknown) => ({
    results: args === "skip" ? [] : links.results,
    status: args === "skip" ? "Exhausted" : links.status,
    loadMore: vi.fn(),
  }),
}));
vi.mock("convex-helpers/react/cache/hooks", () => ({
  useQuery: () => undefined,
}));
vi.mock("@/components/url-shortener", () => ({ UrlShortener: () => null }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock("@/hooks/use-favicon", () => ({
  useFavicon: () => ({ faviconUrl: null, isLoading: false }),
}));
vi.mock("@/lib/posthog", () => ({
  trackUrlCopied: vi.fn(),
  trackUrlDeleted: vi.fn(),
}));
vi.mock("react-hotkeys-hook", () => ({ useHotkeys: vi.fn() }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/ui/dotmatrix-loader-icon", () => ({
  DotmatrixLoaderIcon: () => null,
}));

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

function renderPage(page: React.ReactNode) {
  return renderToStaticMarkup(React.createElement(MemoryRouter, null, page));
}

test.each(["Exhausted", "CanLoadMore"])(
  "Recent Links stays a five-link preview when the list is %s",
  (status) => {
    links.status = status;
    const html = renderPage(React.createElement(HomeRoute));
    const rows = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1];

    expect(rows?.match(/<tr\b/g)).toHaveLength(5);
    expect(html).toContain('href="/urls"');
    expect(html).toContain("[View All Links]");
    expect(html).not.toContain("links loaded");
    expect(html).not.toContain("Load more links");
  },
);

test.each(["Exhausted", "CanLoadMore"])(
  "the full list offers more links only when available: %s",
  (status) => {
    links.status = status;
    const html = renderPage(
      React.createElement(UrlTable, { showPagination: true }),
    );

    expect(html.includes("Load more links")).toBe(status === "CanLoadMore");
    expect(html).not.toContain("links loaded");
  },
);

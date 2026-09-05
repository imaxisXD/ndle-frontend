import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import type { Id } from "../convex/_generated/dataModel";

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn(),
  usePaginatedQuery: () => ({
    results: [],
    status: "CanLoadMore",
    loadMore: vi.fn(),
  }),
}));
vi.mock("convex-helpers/react/cache/hooks", () => ({
  useQuery: () => ({ membersReady: false }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ add: vi.fn() }) }));
vi.mock("@/lib/posthog", () => ({
  trackUrlCopied: vi.fn(),
  trackUrlDeleted: vi.fn(),
  trackCollectionUrlAdded: vi.fn(),
}));
vi.mock("react-hotkeys-hook", () => ({ useHotkeys: vi.fn() }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("@/components/ui/dotmatrix-loader-icon", () => ({
  DotmatrixLoaderIcon: () => null,
}));

import { UrlTable } from "../components/url-table/UrlTable";
import { UrlPickerTable } from "../components/collection/UrlPickerTable";

afterEach(() => vi.unstubAllGlobals());

test("a collection being migrated shows an update state instead of saying there are no links", () => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(UrlTable, {
        collectionId: "collection" as Id<"collections">,
      }),
    ),
  );
  expect(html).toContain("Updating collection");
  expect(html).not.toContain("No links found");
});

test("an empty picker page still offers the next page", () => {
  vi.stubGlobal("React", React);
  const html = renderToStaticMarkup(
    React.createElement(UrlPickerTable, {
      collectionId: "collection" as Id<"collections">,
    }),
  );
  expect(html).toContain("Load more links");
  expect(html).not.toContain("No Links Available");
});

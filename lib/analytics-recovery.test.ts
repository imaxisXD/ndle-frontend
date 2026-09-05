// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { Analytics } from "@/components/analytics";

vi.mock("convex-helpers/react/cache/hooks", () => ({
  useQuery: () => undefined,
}));
vi.mock("@/hooks/useAnalyticsV2", () => ({
  useAnalyticsV2: () => ({
    data: undefined,
    isPending: false,
    isError: true,
    error: new Error("Test request failed"),
  }),
}));
vi.mock("@/components/agentic-charts", () => ({
  AgenticChartChat: () => null,
}));
vi.mock("@/components/ui/dotmatrix-loader-icon", () => ({
  DotmatrixLoaderIcon: () => null,
}));

test("a failed analytics request keeps the date picker available", () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const markup = renderToStaticMarkup(createElement(Analytics));
    expect(markup).toContain("Analytics could not load");
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain("Add Filter");
    expect(markup).toContain("Try another date range");
    expect(markup.indexOf('role="combobox"')).toBeLessThan(
      markup.indexOf("Analytics could not load"),
    );
  } finally {
    log.mockRestore();
  }
});

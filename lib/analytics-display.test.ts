// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { getVariantName } from "@/components/charts/variant-performance-chart";

vi.mock("@/components/ui/dotmatrix-loader-icon", () => ({
  DotmatrixLoaderIcon: () => null,
}));

test("missing hourly and traffic-type data are shown as unavailable, not measured zeroes", () => {
  const markup = renderToStaticMarkup(
    createElement(AnalyticsSection, {
      clicksTimelineData: [{ time: "2026-08-08", clicks: 1 }],
      browserData: [],
      countryData: [],
      deviceData: [],
      osData: [],
      referrerData: [],
      botHumanData: null,
      hourlyActivityData: null,
      isLoading: false,
    }),
  );
  expect(markup).toContain(
    "Human and bot counts are unavailable for this date range.",
  );
  expect(markup).toContain(
    "Hourly activity is unavailable for this date range. Daily totals are shown above.",
  );
});

test("A/B labels match the projected ids: control is A, stored variants start at B", () => {
  expect(getVariantName("control")).toBe("Control");
  expect(getVariantName("variant_0")).toBe("Variant B");
  expect(getVariantName("variant_1")).toBe("Variant C");
  expect(getVariantName("variant_3")).toBe("Variant E");
});

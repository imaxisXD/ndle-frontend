// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { AnalyticsHistoryNotice } from "@/components/analytics-history-notice";

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

test("historical uncertainty is visible even when all available records were loaded", () => {
  const markup = renderToStaticMarkup(
    createElement(AnalyticsHistoryNotice, {
      history: { status: "unverified", before: "2026-09-05T17:09:12.000Z" },
    }),
  );
  expect(markup).toContain("Historical data may be incomplete");
  expect(markup).toContain("5 Sept 2026, 17:09 UTC");
  expect(markup).toContain("old totals could not be fully verified");
  expect(renderToStaticMarkup(createElement(AnalyticsHistoryNotice, {}))).toBe(
    "",
  );
});

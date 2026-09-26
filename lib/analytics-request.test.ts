// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { isRangeAvailable } from "./analytics-access";
import {
  analyticsRequestError,
  getLinkAnalyticsState,
  isPlanRequiredError,
  type LinkAnalyticsStatus,
} from "./analytics-request";

// The chart loader imports a stylesheet, which the test runner cannot load.
vi.mock("@/components/ui/dotmatrix-loader-icon", () => ({
  DotmatrixLoaderIcon: () => null,
}));

const settled = {
  data: { data: [] },
  error: null,
  isError: false,
  isFetching: false,
  isLoading: false,
};
const failedWith = (error: unknown) => ({
  ...settled,
  data: undefined,
  error,
  isError: true,
});

describe("analytics request errors", () => {
  test("a plan-limited range is told apart from other refusals", async () => {
    const planLimited = await analyticsRequestError(
      Response.json(
        {
          error: "This analytics range requires a Pro plan.",
          code: "plan_required",
        },
        { status: 403 },
      ),
      "Failed to load timeseries",
    );
    expect(planLimited).toMatchObject({
      status: 403,
      message: "This analytics range requires a Pro plan.",
    });
    expect(isPlanRequiredError(planLimited)).toBe(true);

    // A 403 passed through from the analytics service is an ordinary failure.
    const forwarded = await analyticsRequestError(
      Response.json(
        { error: "Failed to fetch analytics data" },
        { status: 403 },
      ),
      "Failed to load timeseries",
    );
    expect(isPlanRequiredError(forwarded)).toBe(false);
    expect(isPlanRequiredError(new Error("plan_required"))).toBe(false);
  });

  test("a response without a JSON body keeps the status and uses the fallback", async () => {
    const error = await analyticsRequestError(
      new Response("upstream timeout", { status: 502 }),
      "Failed to load breakdown",
    );
    expect(error).toMatchObject({
      status: 502,
      message: "Failed to load breakdown",
    });
    expect(isPlanRequiredError(error)).toBe(false);
  });
});

describe("link analytics state", () => {
  test("loaded queries are ready", () => {
    expect(getLinkAnalyticsState([settled, settled])).toEqual({
      status: "ready",
      failed: [],
      isLoading: false,
    });
  });

  test("a request that failed without data is an error, not zero clicks", () => {
    const failed = failedWith(new Error("Failed to load timeseries"));
    expect(getLinkAnalyticsState([settled, failed])).toEqual({
      status: "error",
      failed: [failed],
      isLoading: false,
    });
  });

  test("a failed background refresh keeps showing the last result", () => {
    const refreshFailed = {
      ...failedWith(new Error("timeout")),
      data: { data: [] },
    };
    expect(getLinkAnalyticsState([settled, refreshFailed]).status).toBe(
      "ready",
    );
  });

  test("a retry in progress shows as loading", () => {
    const retrying = { ...failedWith(new Error("timeout")), isFetching: true };
    expect(getLinkAnalyticsState([settled, retrying])).toEqual({
      status: "ready",
      failed: [],
      isLoading: true,
    });
  });

  test("a range the plan does not include asks for Pro instead of showing an error", async () => {
    const planLimited = failedWith(
      await analyticsRequestError(
        Response.json({ error: "Pro", code: "plan_required" }, { status: 403 }),
        "Failed to load timeseries",
      ),
    );
    expect(getLinkAnalyticsState([planLimited, planLimited]).status).toBe(
      "plan-required",
    );
    expect(getLinkAnalyticsState([settled], { rangeLocked: true })).toEqual({
      status: "plan-required",
      failed: [],
      isLoading: false,
    });
  });
});

describe("range availability", () => {
  test("free and guest viewers get the last 30 days; nothing is locked while the plan loads", () => {
    for (const plan of ["free", "guest"] as const) {
      expect(isRangeAvailable("30d", plan)).toBe(true);
      expect(isRangeAvailable("3mo", plan)).toBe(false);
      expect(isRangeAvailable("all", plan)).toBe(false);
    }
    expect(isRangeAvailable("12mo", "pro")).toBe(true);
    expect(isRangeAvailable("12mo", undefined)).toBe(true);
  });
});

describe("link analytics section", () => {
  const render = (status: LinkAnalyticsStatus) =>
    renderToStaticMarkup(
      createElement(AnalyticsSection, {
        clicksTimelineData: [],
        browserData: [],
        countryData: [],
        deviceData: [],
        osData: [],
        botHumanData: null,
        hourlyActivityData: null,
        referrerData: [],
        isLoading: false,
        status,
        onRetry: () => {},
        onShowAvailableRange: () => {},
      }),
    );

  test("a failed load offers a retry instead of empty charts", () => {
    const markup = render("error");
    expect(markup).toContain("Analytics could not load");
    expect(markup).toContain("Retry");
    expect(markup).not.toContain("Hourly Activity");
  });

  test("a plan-limited range explains the limit instead of empty charts", () => {
    const markup = render("plan-required");
    expect(markup).toContain("Longer date ranges are part of Pro");
    expect(markup).toContain("Show last 30 days");
    expect(markup).not.toContain("Analytics could not load");
    expect(markup).not.toContain("Hourly Activity");
  });
});

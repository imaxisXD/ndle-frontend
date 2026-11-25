"use client";

import { useMemo } from "react";
import { getUtcRange, type AnalyticsRange } from "@/lib/analyticsRanges";
import { getLinkAnalyticsState } from "@/lib/analytics-request";
import { buildClickTimeline } from "@/lib/click-timeline";
import { useTimeseries, useVariantPerformance } from "@/hooks/useAnalytics";
import { useAnalyticsV2 } from "@/hooks/useAnalyticsV2";
import {
  getVariantName,
  type VariantLabels,
} from "@/components/charts/variant-performance-chart";

interface UseLinkDetailAnalyticsArgs {
  slug: string;
  range: AnalyticsRange;
  excludeBots: boolean;
  rangeLocked: boolean;
  isABTestEnabled: boolean;
  linkId?: string;
  abVariants?: Array<{ url: string }>;
}

/**
 * Fetches link-level analytics using just two requests (local-timezone
 * timeseries + consolidated analytics/v2 summary) plus optional A/B variants.
 */
export function useLinkDetailAnalytics({
  slug,
  range,
  excludeBots,
  rangeLocked,
  isABTestEnabled,
  linkId,
  abVariants,
}: UseLinkDetailAnalyticsArgs) {
  const timeseries = useTimeseries({
    range,
    linkSlug: slug,
    scope: "link",
    enabled: !rangeLocked,
    excludeBots,
  });

  const summaryWindow = useMemo(() => {
    const { start, end } = getUtcRange(range);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, [range]);

  const summary = useAnalyticsV2({
    start: summaryWindow.start,
    end: summaryWindow.end,
    filters: { link: slug, excludeBots },
    pollingInterval: 60_000,
    enabled: !rangeLocked,
  });

  const variantPerf = useVariantPerformance({
    range,
    linkId: isABTestEnabled && linkId ? linkId : undefined,
    enabled: isABTestEnabled && !rangeLocked,
    excludeBots,
  });

  const derived = useMemo(() => {
    const clicksTimelineData = buildClickTimeline(timeseries.data, range);
    const v2 = summary.data;

    const traffic = v2?.bot_traffic;
    const botHumanData =
      traffic && Number.isFinite(traffic.human) && Number.isFinite(traffic.bot)
        ? [
            { name: "Human", value: traffic.human, color: "#22c55e" },
            { name: "Bot", value: traffic.bot, color: "#ef4444" },
          ]
        : null;

    const browserData = (v2?.browsers ?? []).map((row) => ({
      month: row.browser || "Unknown",
      clicks: row.clicks,
    }));

    const deviceData = (v2?.devices ?? []).map((row) => ({
      device: row.device || "Unknown",
      clicks: row.clicks,
    }));

    const osData = (v2?.os ?? []).map((row) => ({
      os: row.os || "Unknown",
      clicks: row.clicks,
    }));

    const countryData = Object.entries(v2?.countryCounts ?? {})
      .map(([country, clicks]) => ({
        country: country || "Unknown",
        clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    const referrerData = Object.entries(v2?.refererCounts ?? {})
      .map(([domain, clicks]) => ({
        domain: domain || "Direct / None",
        clicks,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    const variantData = variantPerf.data?.variants || undefined;
    const variantMap: VariantLabels = {
      control: { name: getVariantName("control") },
    };
    if (abVariants) {
      abVariants.forEach((variant, index) => {
        const variantId = `variant_${index}`;
        variantMap[variantId] = {
          name: getVariantName(variantId),
          url: variant.url,
        };
      });
    }

    return {
      clicksTimelineData,
      browserData,
      countryData,
      deviceData,
      osData,
      botHumanData,
      referrerData,
      variantData,
      variantMap,
    };
  }, [timeseries.data, summary.data, variantPerf.data, range, abVariants]);

  const analyticsState = getLinkAnalyticsState(
    [timeseries, summary, variantPerf],
    { rangeLocked },
  );

  const retryFailedAnalytics = () => {
    for (const query of analyticsState.failed) {
      void query.refetch();
    }
  };

  return {
    derived,
    analyticsState,
    retryFailedAnalytics,
  };
}

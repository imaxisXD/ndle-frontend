import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import type { AnalyticsRange } from "@/lib/analyticsRanges";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import LinkDetailSkeleton from "@/components/skeleton-routes/link-detail-skeleton";
import MetadataCard from "@/components/metadata-card";
import { makeShortLink } from "@/lib/config";
import { LinkHeader } from "@/components/LinkHeader";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { DeleteLinkCard } from "@/components/DeleteLinkCard";
import { useDashboardDerived } from "@/hooks/useDashboardDerived";

export default function LinkDetailRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const { add } = useToast();
  const slug = params[":slug"] || params.slug || "unknown";
  const [range, setRange] = useState<AnalyticsRange>("7d");

  const dashboardRes = useQuery(api.analyticsCache.getAnalytics, {
    range,
    linkSlug: String(slug),
    scope: "dashboard",
  });

  const requestRefresh = useMutation(api.analyticsCache.requestRefresh);

  useEffect(() => {
    if (dashboardRes && dashboardRes.fresh === false) {
      void requestRefresh({
        range,
        linkSlug: String(slug),
        scope: "dashboard",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardRes?.fresh, range, slug, requestRefresh]);

  const shortUrl = makeShortLink(String(slug));
  const deleteUrl = useMutation(api.urlMainFuction.deleteUrl);
  const queryResult = useQuery(api.urlAnalytics.getUrlAnalytics, {
    urlSlug: slug,
  });

  const skeleton = !queryResult;
  const {
    analytics: analyticsData,
    url,
    isError,
    message,
  } = queryResult ?? {
    analytics: null,
    url: null,
    isError: false,
    message: "",
  };

  if (isError && message !== "") {
    add({
      type: "error",
      title: "Error",
      description: message,
    });
  }

  const payload = dashboardRes?.data ?? null;
  const derived = useDashboardDerived({ payload, range });

  if (skeleton) {
    return <LinkDetailSkeleton shortUrl={shortUrl} />;
  }

  return (
    <>
      <LinkHeader
        shortUrl={shortUrl}
        range={range}
        onRangeChange={setRange}
        totalClickCounts={analyticsData?.totalClickCounts || 0}
      />

      <AnalyticsSection
        clicksTimelineData={derived.clicksTimelineData}
        browserData={derived.browserData}
        countryData={derived.countryData}
        deviceData={derived.deviceData}
        osData={derived.osData}
        botHumanData={derived.botHumanData}
        latencyBuckets={derived.latencyBuckets}
        hourlyActivityData={derived.hourlyActivityData}
        isLoading={Boolean(!dashboardRes || dashboardRes.fresh === false)}
      />

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <MetadataCard
          shortslug={url?.slugAssigned}
          fullurl={url?.fullurl}
          trackingEnabled={url?.trackingEnabled}
          creationTime={url?._creationTime}
        />

        <DeleteLinkCard
          onDelete={async () => {
            await deleteUrl({ urlSlug: slug });
            navigate("/");
            add({
              type: "success",
              title: "Link deleted",
              description: `The link has been deleted successfully`,
            });
          }}
        />
      </section>
    </>
  );
}

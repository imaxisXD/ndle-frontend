import { useParams, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import type { AnalyticsRange } from "@/lib/analyticsRanges";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import LinkDetailSkeleton from "@/components/skeleton-routes/link-detail-skeleton";
import { makeShortLink } from "@/lib/config";
import { LinkHeader } from "@/components/LinkHeader";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { DeleteLinkCard } from "@/components/DeleteLinkCard";
import { LinkSettingsPanel } from "@/components/LinkSettingsPanel";
import { LinkActivityLog } from "@/components/LinkActivityLog";
import { LinkAIChatPanel } from "@/components/LinkAIChatPanel";
import { LinkHealthPanel } from "@/components/LinkHealthPanel";
import { useDashboardDerived } from "@/hooks/useDashboardDerived";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/base-tabs";
import { GraphUp, Settings, List, MagicWand, ShieldCheck } from "iconoir-react";

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

  const handleDownloadQR = () => {
    // TODO: Implement QR download functionality
    add({
      type: "success",
      title: "QR Download",
      description: "QR download functionality coming soon!",
    });
  };

  const handleDelete = async () => {
    await deleteUrl({ urlSlug: slug });
    navigate("/");
    add({
      type: "success",
      title: "Link deleted",
      description: `The link has been deleted successfully`,
    });
  };

  if (skeleton) {
    return <LinkDetailSkeleton shortUrl={shortUrl} />;
  }

  return (
    <div className="space-y-8">
      <LinkHeader
        shortUrl={shortUrl}
        fullUrl={url?.fullurl}
        range={range}
        onRangeChange={setRange}
        totalClickCounts={analyticsData?.totalClickCounts || 0}
        qrEnabled={url?.qrEnabled}
        expiresAt={url?.expiresAt}
        creationTime={url?._creationTime}
        onDownloadQR={url?.qrEnabled ? handleDownloadQR : undefined}
      />

      {/* Tabbed Navigation */}
      <Tabs defaultValue="analytics">
        <TabsList variant="line" size="md" className="mb-6">
          <TabsTrigger value="analytics">
            <GraphUp className="size-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="activity">
            <List className="size-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="ai-chat">
            <MagicWand className="size-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="health">
            <ShieldCheck className="size-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
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
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <LinkSettingsPanel
              fullUrl={url?.fullurl}
              trackingEnabled={url?.trackingEnabled}
              expiresAt={url?.expiresAt}
              qrEnabled={url?.qrEnabled}
              qrStyle={url?.qrStyle as any}
              creationTime={url?._creationTime}
            />

            {/* Danger Zone */}
            <div className="pt-6">
              <h3 className="text-muted-foreground mb-4 text-sm font-medium">
                Danger Zone
              </h3>
              <DeleteLinkCard onDelete={handleDelete} />
            </div>
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <LinkActivityLog />
        </TabsContent>

        {/* AI Chat Tab */}
        <TabsContent value="ai-chat">
          <LinkAIChatPanel shortUrl={shortUrl} fullUrl={url?.fullurl || ""} />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health">
          <LinkHealthPanel shortUrl={shortUrl} fullUrl={url?.fullurl || ""} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

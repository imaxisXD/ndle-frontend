import { useParams, useNavigate } from "react-router";
import { useState, useEffect } from "react";
import type { AnalyticsRange } from "@/lib/analyticsRanges";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import LinkDetailSkeleton from "@/components/skeleton-routes/link-detail-skeleton";
import { makeShortLinkWithDomain } from "@/lib/config";
import { LinkHeader } from "@/components/LinkHeader";
import { AnalyticsSection } from "@/components/AnalyticsSection";
import { DeleteLinkCard } from "@/components/DeleteLinkCard";
import { LinkSettingsPanel } from "@/components/LinkSettingsPanel";
import { LinkActivityLog } from "@/components/LinkActivityLog";
import { LinkNotesPanel } from "@/components/LinkNotesPanel";
import { LinkHealthPanel } from "@/components/LinkHealthPanel";
import { isRangeAvailable } from "@/lib/analytics-access";
import { useLinkDetailAnalytics } from "@/hooks/use-link-detail-analytics";
import { useRefreshLinkAnalytics } from "@/hooks/use-refresh-link-analytics";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/base-tabs";
import { GraphUp, Settings, List, Bookmark, ShieldCheck } from "iconoir-react";

const linkTabClassName =
  "min-w-0 flex-col gap-1 text-xs sm:flex-row sm:gap-2 sm:text-sm";

export default function LinkDetailRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const { add } = useToast();
  const slug = params[":slug"] || params.slug || "unknown";
  const [range, setRange] = useState<AnalyticsRange>("7d");
  // Bots are counted by default; the filter removes them from every chart.
  const [excludeBots, setExcludeBots] = useState(false);

  const deleteUrl = useMutation(api.urlMainFuction.deleteUrl);
  const queryResult = useQuery(api.urlAnalytics.getUrlAnalytics, {
    urlSlug: slug,
  });
  const viewer = useQuery(api.users.getViewerState);
  // Ranges the plan does not include are answered 403 by every analytics
  // route, so they are not requested; the section explains the limit instead.
  const rangeLocked = !isRangeAvailable(range, viewer?.membership);

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

  const isABTestEnabled = Boolean(
    url && url.abEnabled && url.abVariants && url.abVariants.length > 0,
  );
  const linkId = url?.linkId || url?._id;
  useRefreshLinkAnalytics({
    linkSlug: String(slug),
    linkId: linkId ? String(linkId) : undefined,
    liveClickCount: analyticsData?.totalClickCounts,
  });

  const { derived, analyticsState, retryFailedAnalytics } =
    useLinkDetailAnalytics({
      slug: String(slug),
      range,
      excludeBots,
      rangeLocked,
      isABTestEnabled,
      linkId: linkId ? String(linkId) : undefined,
      abVariants: url?.abVariants,
    });

  const shortUrl = makeShortLinkWithDomain(String(slug), url?.customDomain);

  useEffect(() => {
    if (isError && message !== "") {
      add({
        type: "error",
        title: "Error",
        description: message,
      });
    }
  }, [add, isError, message]);

  const handleDownloadQR = () => {
    // The hosted image encodes this link's short URL, never its destination.
    const anchor = document.createElement("a");
    anchor.href = `/api/qr/${encodeURIComponent(String(slug))}?format=png`;
    anchor.download = `${slug}-qr.png`;
    anchor.click();
  };

  const handleDelete = async () => {
    await deleteUrl({ urlSlug: slug });
    navigate("/dashboard");
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
        plan={viewer?.membership}
        excludeBots={excludeBots}
        onExcludeBotsChange={setExcludeBots}
        totalClickCounts={analyticsData?.totalClickCounts || 0}
        qrEnabled={url?.qrEnabled}
        expiresAt={url?.expiresAt}
        creationTime={url?._creationTime}
        onDownloadQR={url?.qrEnabled ? handleDownloadQR : undefined}
      />

      {/* Tabbed Navigation */}
      <Tabs defaultValue="analytics">
        {/* Phones: five equal columns with the icon above the label, so every
            tab fits without scrolling. */}
        <TabsList
          variant="line"
          size="md"
          className="mb-6 grid w-full grid-cols-5 gap-0 sm:flex sm:w-auto sm:gap-8"
        >
          <TabsTrigger value="analytics" className={linkTabClassName}>
            <GraphUp className="size-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="activity" className={linkTabClassName}>
            <List className="size-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="notes" className={linkTabClassName}>
            <Bookmark className="size-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="health" className={linkTabClassName}>
            <ShieldCheck className="size-4" />
            Health
          </TabsTrigger>
          <TabsTrigger value="settings" className={linkTabClassName}>
            <Settings className="size-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsSection
            clicksTimelineData={derived.clicksTimelineData}
            browserData={derived.browserData}
            countryData={derived.countryData}
            deviceData={derived.deviceData}
            osData={derived.osData}
            botHumanData={derived.botHumanData}
            referrerData={derived.referrerData}
            variantData={derived.variantData}
            variantMap={derived.variantMap}
            isLoading={analyticsState.isLoading}
            status={analyticsState.status}
            onRetry={retryFailedAnalytics}
            onShowAvailableRange={() => setRange("30d")}
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
              qrStyle={url?.qrStyle}
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
          <LinkActivityLog linkSlug={String(slug)} />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <LinkNotesPanel shortUrl={shortUrl} fullUrl={url?.fullurl || ""} />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health">
          {url?._id && <LinkHealthPanel urlId={url._id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

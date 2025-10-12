import { useParams, useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BinMinusIn,
  Clock,
  Link,
  OpenInBrowser,
  OpenNewWindow,
} from "iconoir-react";
import { BrowserChart } from "@/components/charts/browser-chart";
import { CountryChart } from "@/components/charts/country-chart";
import { DeviceOSChart } from "@/components/charts/device-os-chart";
import { ClicksTimelineChart } from "@/components/charts/clicks-timeline-chart";
import { BotTrafficChart } from "@/components/charts/bot-traffic-chart";
import { LatencyChart } from "@/components/charts/latency-chart";
import { HourlyActivityChart } from "@/components/charts/hourly-activity-chart";
import { LiveClickHero } from "@/components/charts/live-click-hero";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { formatRelative } from "@/lib/utils";
import LinkDetailSkeleton from "@/components/skeleton-routes/link-detail-skeleton";
import MetadataCard from "@/components/metadata-card";
import LinkWithIcon from "@/components/ui/link-with-icon";

export default function LinkDetailRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const { add } = useToast();
  const slug = params[":slug"] || params.slug || "unknown";
  const shortUrl = `ndle.im/${slug}`;
  const deleteUrl = useMutation(api.urlMainFuction.deleteUrl);
  const queryResult = useQuery(api.urlAnalytics.getUrlAnalytics, {
    urlSlug: slug,
  });

  if (!queryResult) {
    return <LinkDetailSkeleton shortUrl={shortUrl} />;
  }

  const { analytics: analyticsData, url, isError, message } = queryResult;

  if (isError) {
    add({
      type: "error",
      title: "Error",
      description: message,
    });
  }

  return (
    <>
      <header className="space-y-4">
        <div className="text-primary mb-14 flex flex-col items-start gap-3">
          <LinkWithIcon link={shortUrl} href={`https://${shortUrl}`} />
          <p className="text-muted-foreground text-sm">
            Link analytics and settings
          </p>
        </div>
        <LiveClickHero counterValue={analyticsData?.totalClickCounts || 0} />
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <ClicksTimelineChart />
        <BrowserChart />
        <CountryChart />
        <DeviceOSChart />
        {/* <LinkPerformanceChart /> */}
        <BotTrafficChart />
        <LatencyChart />
        <HourlyActivityChart />
        {/* <DatacenterChart /> */}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <MetadataCard
          shortslug={url?.slugAssigned}
          fullurl={url?.fullurl}
          trackingEnabled={url?.trackingEnabled}
          creationTime={url?._creationTime}
        />

        <Card className="border-red-500">
          <CardHeader className="rounded-t-xl border-red-500 bg-red-50">
            <CardTitle className="text-red-600">Delete Link</CardTitle>
            <CardToolbar>
              <Button
                variant="destructive"
                type="button"
                onClick={async () => {
                  await deleteUrl({ urlSlug: slug });
                  add({
                    type: "success",
                    title: "Link deleted",
                    description: `The link has been deleted successfully`,
                  });
                  navigate("/");
                }}
              >
                <BinMinusIn className="h-4 w-4" /> Delete Link
              </Button>
            </CardToolbar>
          </CardHeader>
          <CardContent className="flex flex-col items-start justify-between gap-2">
            <CardDescription className="">
              Delete this shortened link permanently.
            </CardDescription>
            <p className="text-muted-foreground mt-1 text-xs">
              This will remove all the data associated with this link, including
              clicks, analytics and metadata.
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

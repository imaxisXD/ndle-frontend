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
import { BinMinusIn, Clock, OpenInBrowser, OpenNewWindow } from "iconoir-react";
import { BrowserChart } from "@/components/charts/browser-chart";
import { CountryChart } from "@/components/charts/country-chart";
import { DeviceOSChart } from "@/components/charts/device-os-chart";
import { ClicksTimelineChart } from "@/components/charts/clicks-timeline-chart";
import { LinkPerformanceChart } from "@/components/charts/link-performance-chart";
import { BotTrafficChart } from "@/components/charts/bot-traffic-chart";
import { LatencyChart } from "@/components/charts/latency-chart";
import { HourlyActivityChart } from "@/components/charts/hourly-activity-chart";
import { DatacenterChart } from "@/components/charts/datacenter-chart";
import { LiveClickHero } from "@/components/charts/live-click-hero";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function LinkDetailRoute() {
  const params = useParams();
  const navigate = useNavigate();
  const slug = params[":slug"] || params.slug || "unknown";
  const shortUrl = `ndle.im/${slug}`;

  const analyticsData = useQuery(api.urlAnalytics.getUrlAnalytics, {
    urlSlug: slug,
  });

  return (
    <>
      <header className="space-y-4">
        <div className="text-primary mb-14 flex flex-col items-start gap-3">
          <a
            href={`https://${shortUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group pointer-events-auto flex items-center justify-center gap-1.5 text-3xl font-medium tracking-tight transition-all duration-150 ease-linear hover:text-blue-600 hover:underline hover:decoration-blue-600 hover:decoration-dashed hover:underline-offset-4"
          >
            {shortUrl}

            <OpenNewWindow
              className="text-muted-foreground size-4 group-hover:text-blue-600"
              strokeWidth={2}
            />
          </a>
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
        <LinkPerformanceChart />
        <BotTrafficChart />
        <LatencyChart />
        <HourlyActivityChart />
        <DatacenterChart />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-base font-medium">Metadata</h3>
            <div className="text-muted-foreground mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <OpenInBrowser className="h-4 w-4" /> Short URL:{" "}
                <code className="text-foreground">https://{shortUrl}</code>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> Created: 2 days ago
              </div>
              <div>Tracking: Enabled</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Delete Link</CardTitle>
            <CardToolbar>
              <Button
                variant="destructive"
                type="button"
                onClick={() => navigate("/")}
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
              clicks and metadata.
            </p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

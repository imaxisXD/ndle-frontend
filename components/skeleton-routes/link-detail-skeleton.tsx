import { LiveClickHero } from "../charts/live-click-hero";
import { OpenNewWindow } from "iconoir-react";
import { ClicksTimelineChart } from "../charts/clicks-timeline-chart";
import { BrowserChart } from "../charts/browser-chart";
import { CountryChart } from "../charts/country-chart";
import { DeviceOSChart } from "../charts/device-os-chart";
import { BotTrafficChart } from "../charts/bot-traffic-chart";
import { LatencyChart } from "../charts/latency-chart";
import { HourlyActivityChart } from "../charts/hourly-activity-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { CardDescription } from "../ui/card";
import MetadataCard from "../metadata-card";

export default function LinkDetailSkeleton({ shortUrl }: { shortUrl: string }) {
  return (
    <>
      <header className="space-y-4">
        <div className="text-primary mb-14 flex flex-col items-start gap-3">
          <a
            href={`https://${shortUrl}`}
            target="_blank"
            rel="noopener"
            className="group pointer-events-auto flex items-center justify-center gap-1.5 text-3xl font-medium tracking-tight transition-all duration-150 ease-linear hover:text-blue-600 hover:underline hover:decoration-blue-600 hover:decoration-dashed hover:underline-offset-4"
          >
            {shortUrl}

            <OpenNewWindow
              className="text-muted-foreground size-4 group-hover:text-blue-600"
              strokeWidth={2}
            />
          </a>
        </div>
        <LiveClickHero counterValue={0} />
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <ClicksTimelineChart />
        <BrowserChart />
        <CountryChart />
        <DeviceOSChart />
        <BotTrafficChart />
        <LatencyChart data={[]} />
        <HourlyActivityChart />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <MetadataCard />

        <Card className="border-red-500">
          <CardHeader className="rounded-t-xl border-red-500 bg-red-50">
            <CardTitle className="text-red-600">Delete Link</CardTitle>
            <CardToolbar>
              <Skeleton className="h-10 w-32" />
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

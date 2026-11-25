import { OpenNewWindow } from "iconoir-react";
import { ClicksTimelineChart } from "../charts/clicks-timeline-chart";
import { BrowserChart } from "../charts/browser-chart";
import { CountryChart } from "../charts/country-chart";
import { DeviceOSChart } from "../charts/device-os-chart";
import { BotTrafficChart } from "../charts/bot-traffic-chart";
import { ReferrerChart } from "../charts/referrer-chart";
import { Skeleton } from "../ui/skeleton";

export default function LinkDetailSkeleton({ shortUrl }: { shortUrl: string }) {
  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-col items-start gap-3">
          <a
            href={`https://${shortUrl}`}
            target="_blank"
            rel="noopener"
            className="text-primary group pointer-events-auto flex items-center justify-center gap-1.5 text-3xl font-medium tracking-tight transition-all duration-150 ease-linear hover:text-blue-600 hover:underline hover:decoration-blue-600 hover:decoration-dashed hover:underline-offset-4"
          >
            {shortUrl}
            <OpenNewWindow
              className="text-muted-foreground size-4 group-hover:text-blue-600"
              strokeWidth={2}
              aria-hidden="true"
            />
          </a>
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
      </header>

      <div className="border-border flex gap-6 border-b pb-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-5 w-20" />
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        {/* isLoading so the cards show their loading state, not "no clicks yet". */}
        <ClicksTimelineChart isLoading />
        <BrowserChart isLoading />
        <ReferrerChart isLoading />
        <CountryChart isLoading />
        <DeviceOSChart isLoading />
        <BotTrafficChart isLoading />
      </section>
    </div>
  );
}

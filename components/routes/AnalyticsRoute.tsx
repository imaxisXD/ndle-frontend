import { Analytics } from "@/components/analytics";
import { UrlList } from "@/components/recent-list";

export default function AnalyticsRoute() {
  return (
    <>
      <header>
        <h1 className="font-mono text-3xl font-medium tracking-tight">
          Analytics
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          Detailed insights and statistics
        </p>
      </header>
      <section aria-labelledby="analytics-content-heading">
        <h2 className="sr-only" id="analytics-content-heading">
          Analytics Content
        </h2>
        <Analytics />
      </section>
      <section aria-labelledby="links-list-heading">
        <h2 className="sr-only" id="links-list-heading">
          Links List
        </h2>
        <UrlList />
      </section>
    </>
  );
}

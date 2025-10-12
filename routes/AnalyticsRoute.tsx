import { Analytics } from "@/components/analytics";

export default function AnalyticsRoute() {
  return (
    <>
      <header>
        <h1 className="text-3xl font-medium tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-2 text-sm">
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
        {/* <UrlList>
          <UrlList.Header
            title="Recent Links"
            description="Your latest shortened links"
          />
          <UrlList.Table />
        </UrlList> */}
      </section>
    </>
  );
}

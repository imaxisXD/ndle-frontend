import { Analytics } from "@/components/analytics";

export default function AnalyticsRoute({ userId }: { userId: string }) {
  return (
    <>
      <header>
        <h1 className="font-doto roundness-100 text-4xl font-black">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Detailed insights and statistics
        </p>
      </header>
      <section aria-labelledby="analytics-content-heading">
        <h2 className="sr-only" id="analytics-content-heading">
          Analytics Content
        </h2>
        <Analytics userId={userId} />
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

import { UrlShortener } from "@/components/url-shortener";
import { UrlTable } from "@/components/url-table/UrlTable";

export default function HomeRoute() {
  return (
    <>
      <header className="flex flex-col items-start">
        <h1
          className="font-doto roundness-100 text-5xl font-bold tracking-tight"
          id="home-heading"
        >
          ndle
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Short. Sharp. Smarter.
        </p>
      </header>

      <section aria-labelledby="create-shortcut-heading">
        <h2 className="sr-only" id="create-shortcut-heading">
          Create Shortcut
        </h2>
        <UrlShortener />
      </section>

      <section aria-labelledby="recent-links-heading">
        <h2 className="sr-only" id="recent-links-heading">
          Recent Links
        </h2>
        <UrlTable
          showHeader
          showFooter
          defaultPageSize={5}
          headerTitle="Recent Links"
          headerDescription="Your latest shortened links"
          footerContent="View All Links"
        />
      </section>
    </>
  );
}

import { UrlTable } from "@/components/url-table/UrlTable";

export default function UrlsRoute() {
  return (
    <>
      <header className="flex flex-col items-start">
        <h1
          className="font-doto roundness-100 text-4xl font-black transition-all duration-300 ease-in-out select-none hover:font-extrabold"
          id="urls-heading"
        >
          Links
        </h1>

        <p className="text-muted-foreground mt-2 text-sm">
          Manage all your shortened links
        </p>
      </header>

      <section aria-labelledby="all-links-heading">
        <h2 className="sr-only" id="all-links-heading">
          All Links
        </h2>
        <UrlTable showFilters showPagination defaultPageSize={10} />
      </section>
    </>
  );
}

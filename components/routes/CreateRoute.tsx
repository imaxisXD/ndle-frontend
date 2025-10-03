export default function CreateRoute() {
  return (
    <>
      <header>
        <h1 className="font-mono text-3xl font-medium tracking-tight">
          Quick Create
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          Bulk import and create multiple links
        </p>
      </header>
      <section
        aria-labelledby="bulk-import-heading"
        className="rounded-lg border border-border bg-card p-8"
      >
        <h2 className="sr-only" id="bulk-import-heading">
          Bulk Import
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="bulk-import-urls"
              className="font-mono text-sm font-medium"
            >
              Bulk Import URLs
            </label>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Paste multiple URLs (one per line) to create shortened links
            </p>
            <textarea
              id="bulk-import-urls"
              placeholder={
                "https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3"
              }
              className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm h-48 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
          <button
            type="button"
            className="rounded-md bg-foreground px-4 py-2 font-mono text-sm text-background transition-colors hover:bg-foreground/90"
          >
            Create All Links
          </button>
        </div>
      </section>
    </>
  );
}

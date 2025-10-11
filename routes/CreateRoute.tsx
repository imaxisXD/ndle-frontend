import { Button } from "@/components/ui/button";

export default function CreateRoute() {
  return (
    <>
      <header>
        <h1 className="text-3xl font-medium tracking-tight">Quick Create</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Bulk import and create multiple links
        </p>
      </header>
      <section
        aria-labelledby="bulk-import-heading"
        className="border-border bg-card rounded-lg border p-8"
      >
        <h2 className="sr-only" id="bulk-import-heading">
          Bulk Import
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="bulk-import-urls" className="text-sm font-medium">
              Bulk Import URLs
            </label>
            <p className="text-muted-foreground mt-1 text-xs">
              Paste multiple URLs (one per line) to create shortened links
            </p>
            <textarea
              id="bulk-import-urls"
              placeholder={
                "https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3"
              }
              className="border-input bg-background focus:ring-foreground/20 mt-3 h-48 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
          <Button type="button">Create All Links</Button>
        </div>
      </section>
    </>
  );
}

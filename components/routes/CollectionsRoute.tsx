import { Collections } from "@/components/collections";

export default function CollectionsRoute() {
  return (
    <>
      <header>
        <h1 className="text-3xl font-medium tracking-tight">Collections</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Organize your links into collections
        </p>
      </header>
      <section aria-labelledby="collections-section-heading">
        <h2 className="sr-only" id="collections-section-heading">
          Collections
        </h2>
        <Collections />
      </section>
    </>
  );
}

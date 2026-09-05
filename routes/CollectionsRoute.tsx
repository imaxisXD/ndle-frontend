import { usePaginatedQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Collections } from "@/components/collection/collections";
import { api } from "@/convex/_generated/api";
import { FunctionReturnType } from "convex/server";

export type CollectionsType = FunctionReturnType<
  typeof api.collectionMangament.getUserCollections
>;

export default function CollectionsRoute() {
  const { results, status, loadMore } = usePaginatedQuery(
    api.collectionMangament.getCollectionsPage,
    {},
    { initialNumItems: 25 },
  );
  const collections = status === "LoadingFirstPage" ? undefined : results;
  return (
    <>
      <header>
        <h1 className="font-doto roundness-100 text-4xl font-black tracking-tighter">
          Collections
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Organize your links into collections
        </p>
      </header>
      <section aria-labelledby="collections-section-heading">
        <h2 className="sr-only" id="collections-section-heading">
          Collections
        </h2>
        <Collections collections={collections} />
        {status !== "Exhausted" && status !== "LoadingFirstPage" && (
          <Button
            variant="outline"
            onClick={() => loadMore(25)}
            disabled={status === "LoadingMore"}
          >
            {status === "LoadingMore" ? "Loading…" : "Load more collections"}
          </Button>
        )}
      </section>
    </>
  );
}

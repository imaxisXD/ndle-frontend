import { useParams, NavLink } from "react-router";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { api } from "@/convex/_generated/api";
import { UrlTable } from "@/components/url-table/UrlTable";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/base-dialog";
import { UrlPickerTable } from "@/components/collection/UrlPickerTable";
import { AddUrlsButton } from "@/components/collection/AddUrlsButton";
import { Skeleton } from "@/components/ui/skeleton";
import { ShimmeringText } from "@/components/ui/shimmering-text";
import { BookmarkBook, BookSolid, Table2Columns } from "iconoir-react";

export default function CollectionDetailRoute() {
  const params = useParams();
  const collectionId = params.slug;
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const collection = useQuery(
    api.collectionMangament.getCollectionById,
    collectionId ? { collectionId } : "skip",
  );

  if (!collectionId) {
    return null;
  }

  if (collection === undefined) {
    return (
      <>
        <header>
          <h1 className="text-3xl font-medium tracking-tight">Collection</h1>
          <Skeleton className="w-64" />
        </header>

        <section aria-labelledby="collection-links-loading">
          <h2 id="collection-links-loading" className="sr-only">
            ndle is gathering your links
          </h2>

          <div className="bg-card mt-6 rounded-xl">
            <Skeleton className="diagonal-dash flex h-[499px] flex-col items-center justify-center rounded-xl">
              <Table2Columns className="text-muted-foreground size-6" />
              <ShimmeringText
                text="ndle is gathering your links..."
                className="mt-4 text-xl tracking-tight"
                duration={2}
                repeat={true}
                repeatDelay={1}
                shimmerColor="var(--accent)"
              />
            </Skeleton>
          </div>
        </section>
      </>
    );
  }

  if (collection === null) {
    return (
      <>
        <header>
          <h1 className="text-3xl font-medium tracking-tight">
            ndle can&apos;t find this collection
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            This collection seems to have vanished into the digital void. It
            might not exist or you don&apos;t have access to it.
          </p>
          <div className="mt-4 inline-block">
            <NavLink
              to="/collections"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
            >
              ← Back to Collections
            </NavLink>
          </div>
        </header>
      </>
    );
  }

  return (
    <>
      <header>
        <div className="mb-6 flex items-center justify-between">
          <NavLink
            to="/collections"
            className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
          >
            ← Back to Collections
          </NavLink>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <AddUrlsButton
              onOpen={() => setIsAddDialogOpen(true)}
              label="Add Links"
            />
            <DialogContent fullscreen className="p-0">
              <div className="flex h-full flex-col">
                <div className="border-b px-4 py-3">
                  <DialogTitle>Add Links to Collection</DialogTitle>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Let ndle help you pick the perfect links
                  </p>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {collection && (
                    <UrlPickerTable
                      collectionId={collection._id as Id<"collections">}
                      onClose={() => setIsAddDialogOpen(false)}
                    />
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <section aria-labelledby="collection-links-heading">
        <h2 className="sr-only" id="collection-links-heading">
          Collection Links
        </h2>
        {collection.urls.length === 0 ? (
          <div className="border-border from-muted/60 mt-6 flex flex-col gap-10 rounded-lg border-2 border-dashed bg-gradient-to-t to-white/10 p-10 text-center">
            <h3 className="text-sm font-medium">
              ndle is ready to help you organize your links
            </h3>
            <div className="mt-10 flex flex-col items-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-lg bg-gradient-to-br from-gray-200/80 to-gray-300/60 p-2">
                  <BookmarkBook className="size-18 text-yellow-500/90" />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  Start building your curated link collection
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <div className="mt-4 inline-block">
                  <AddUrlsButton onOpen={() => setIsAddDialogOpen(true)} />
                </div>
                <DialogContent fullscreen className="p-0">
                  <div className="flex h-full flex-col">
                    <div className="border-b px-4 py-3">
                      <DialogTitle>Add Links to Collection</DialogTitle>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Let ndle help you pick the perfect links
                      </p>
                    </div>
                    <div className="flex-1 overflow-auto p-3">
                      {collection && (
                        <UrlPickerTable
                          collectionId={collection._id as Id<"collections">}
                          onClose={() => setIsAddDialogOpen(false)}
                        />
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : (
          <UrlTable
            showHeader={true}
            showSearch={true}
            showFilters={true}
            showPagination={true}
            defaultPageSize={10}
            headerTitle={collection.name + ` [${collection.urls.length}]`}
            headerDescription={collection.description}
            collectionId={collection._id as Id<"collections">}
          />
        )}
      </section>
    </>
  );
}

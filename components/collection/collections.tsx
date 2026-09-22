"use client";

import { useState, useCallback } from "react";
import { MoreVertCircle, BinMinusIn, Page, KeyCommand } from "iconoir-react";
import { CreateCollectionButton } from "./create-collection-button";
import { CollectionFolder, isHexColor } from "./collection-folder";
import { getCollectionFallbackColor } from "./colors";
import { NavLink, useNavigate } from "react-router";
import { CollectionsType } from "@/routes/CollectionsRoute";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuShortcut,
  MenuTrigger,
} from "@/components/ui/base-menu";
import { Kbd } from "@/components/ui/kbd";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogAction,
  DialogClose,
} from "@/components/ui/base-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";
import { trackCollectionDeleted } from "@/lib/posthog";
import { EmptyStateImage } from "@/components/empty-state-image";

function CollectionMenuCell({
  collection,
  onView,
  onDeleteClick,
}: {
  collection: CollectionsType[number];
  onView: (collectionId: string) => void;
  onDeleteClick: (collectionId: string, collectionName: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useHotkeys(
    "meta+v",
    (e) => {
      if (menuOpen) {
        e.preventDefault();
        onView(collection.id);
        setMenuOpen(false);
      }
    },
    { enabled: menuOpen, preventDefault: true },
  );

  useHotkeys(
    "meta+d",
    (e) => {
      if (menuOpen) {
        e.preventDefault();
        onDeleteClick(collection.id, collection.name);
        setMenuOpen(false);
      }
    },
    { enabled: menuOpen, preventDefault: true },
  );

  return (
    <Menu open={menuOpen} onOpenChange={setMenuOpen}>
      <MenuTrigger
        render={
          <button
            type="button"
            aria-label={`Options for ${collection.name}`}
            className="hover:bg-accent rounded-md p-2 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <MoreVertCircle className="size-5" />
          </button>
        }
      />
      <MenuContent sideOffset={4} className="w-48">
        <MenuItem
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onView(collection.id);
            setMenuOpen(false);
          }}
        >
          <Page />
          <span>View</span>
          <MenuShortcut>
            <Kbd>
              <KeyCommand className="size-2.5 text-white" strokeWidth="2" />
            </Kbd>
            <Kbd>V</Kbd>
          </MenuShortcut>
        </MenuItem>
        <MenuItem
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDeleteClick(collection.id, collection.name);
            setMenuOpen(false);
          }}
        >
          <BinMinusIn />
          <span>Delete</span>
          <MenuShortcut>
            <Kbd>
              <KeyCommand className="size-2.5 text-white" strokeWidth="2" />
            </Kbd>
            <Kbd>D</Kbd>
          </MenuShortcut>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

function CollectionCard({
  collection,
  fallbackColor,
  onView,
  onDeleteClick,
}: {
  collection: CollectionsType[number];
  fallbackColor: string;
  onView: (collectionId: string) => void;
  onDeleteClick: (collectionId: string, collectionName: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  // The picker can store "transparent"; the folder needs a real color.
  const collectionColor = isHexColor(collection.collectionColor)
    ? collection.collectionColor
    : fallbackColor;
  const href = `/collection/${collection.id}`;
  const clickCount = collection.totalClickCount;

  return (
    <div
      className="group relative flex flex-col items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The folder is the card. The label sits on its face like a paper sticker,
          so the art is the container rather than a picture boxed inside one. */}
      <div className="relative">
        <NavLink
          to={href}
          tabIndex={-1}
          aria-hidden
          className="block h-[162px] w-[194px] transition-transform duration-150 ease-out group-hover:-translate-y-[3px] active:scale-[0.99]"
        >
          <CollectionFolder
            previewUrls={collection.previewUrls}
            color={collectionColor}
            size="xs"
            hovered={hovered}
            open={false}
            className="h-[135px] w-[161px] origin-top-left scale-[1.2] transition-transform duration-150 ease-out"
          />
        </NavLink>
        {/* Anchored to the art, not the cell, so it stays beside the folder at every width. */}
        <div className="absolute -top-2 -right-11">
          <CollectionMenuCell
            collection={collection}
            onView={onView}
            onDeleteClick={onDeleteClick}
          />
        </div>
        {/* Name band over an instrument readout: the collection reads as a filing card. */}
        <div className="border-border bg-card absolute top-[54%] left-1/2 w-[88%] -translate-x-1/2 overflow-hidden rounded-sm border shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(0,0,0,0.04)]">
          <NavLink
            to={href}
            className="focus-visible:ring-accent/50 block px-3 py-1.5 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
            style={{
              backgroundColor: `color-mix(in oklab, ${collectionColor} 22%, white)`,
            }}
          >
            <h3 className="truncate text-sm leading-tight font-semibold tracking-tight">
              {collection.name}
            </h3>
          </NavLink>
          <NavLink to={href} tabIndex={-1} className="block px-3 pt-2 pb-2">
            <span className="flex items-end justify-between gap-2">
              <span className="flex flex-col">
                <span className="text-sm leading-none font-semibold tabular-nums">
                  {collection.urlCount}
                </span>
                <span className="text-muted-foreground mt-0.5 text-[10px] leading-none">
                  {collection.urlCount === 1 ? "link" : "links"}
                </span>
              </span>
              <span
                className="border-border h-6 border-l border-dashed"
                aria-hidden
              />
              <span className="flex flex-col items-end">
                <span className="text-sm leading-none font-semibold tabular-nums">
                  {clickCount ?? "—"}
                </span>
                <span className="text-muted-foreground mt-0.5 text-[10px] leading-none">
                  {clickCount === null
                    ? "clicks updating"
                    : clickCount === 1
                      ? "click"
                      : "clicks"}
                </span>
              </span>
            </span>
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export function Collections({
  collections,
}: {
  collections: CollectionsType | undefined;
}) {
  const navigate = useNavigate();
  const { add } = useToast();
  const deleteCollection = useMutation(
    api.collectionMangament.deleteCollection,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const hasNoCollections =
    collections !== undefined && collections.length === 0;

  const handleView = useCallback(
    (collectionId: string) => {
      navigate(`/collection/${collectionId}`);
    },
    [navigate],
  );

  const handleDeleteClick = useCallback(
    (collectionId: string, collectionName: string) => {
      setCollectionToDelete({ id: collectionId, name: collectionName });
      setDeleteDialogOpen(true);
    },
    [],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!collectionToDelete) return;

    try {
      await deleteCollection({
        collectionId: collectionToDelete.id as Id<"collections">,
      });
      trackCollectionDeleted();
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
      add({
        type: "success",
        title: "Collection deleted",
        description: `The collection "${collectionToDelete.name}" has been deleted successfully`,
      });
    } catch (error) {
      add({
        type: "error",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete collection",
      });
    }
  }, [collectionToDelete, deleteCollection, add]);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <CreateCollectionButton
          existingCollectionNames={(collections ?? []).map((c) => c.name)}
        />
      </div>

      {hasNoCollections ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <EmptyStateImage
            alt=""
            className="mb-5 w-full max-w-[460px]"
            name="noCollections"
          />
          <h3 className="text-lg font-medium">No collections yet</h3>
          <p className="text-muted-foreground mt-2 max-w-sm text-sm">
            Create a collection to group links by project, campaign, or team.
          </p>
        </div>
      ) : (
        <div className="grid gap-x-5 gap-y-10 pt-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {collections?.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              fallbackColor={getCollectionFallbackColor(collection.id)}
              onView={handleView}
              onDeleteClick={handleDeleteClick}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="gap-2">
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <BinMinusIn className="size-5 fill-red-100" />
            Confirm Collection Delete
          </DialogTitle>
          <DialogDescription className="text-primary mt-4 text-sm">
            Are you sure you want to delete this collection and all its data?{" "}
            <br />
            <span className="text-muted-foreground text-xs">
              [Note : This action is permanent and cannot be undone]
            </span>
            {collectionToDelete && (
              <div className="my-4">
                <p className="text-sm font-medium">Collection to delete:</p>
                <p className="text-muted-foreground text-xs">
                  [{collectionToDelete.name}]
                </p>
              </div>
            )}
          </DialogDescription>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" type="button">
                  Cancel
                </Button>
              }
            />
            <DialogAction
              onClick={handleDeleteConfirm}
              className={cn(
                "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              <BinMinusIn />
              Delete Collection
            </DialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

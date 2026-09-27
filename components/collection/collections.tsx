"use client";

import { useState, useCallback } from "react";
import { MoreVertCircle, BinMinusIn, Page, KeyCommand } from "iconoir-react";
import { CreateCollectionButton } from "./create-collection-button";
import { isHexColor } from "./collection-folder";
import { GlassFolder, glassTone } from "./glass-folder";
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
            className="focus-visible:ring-accent/50 rounded-md p-1.5 transition-colors outline-none hover:bg-current/15 focus-visible:ring-[3px]"
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
  const [focused, setFocused] = useState(false);
  // The picker can store "transparent"; the folder needs a real color.
  const collectionColor = isHexColor(collection.collectionColor)
    ? collection.collectionColor
    : fallbackColor;
  const href = `/collection/${collection.id}`;
  const clickCount = collection.totalClickCount;
  const links = `${collection.urlCount} ${collection.urlCount === 1 ? "link" : "links"}`;
  const clicks =
    clickCount === null
      ? "clicks updating"
      : `${clickCount.toLocaleString()} ${clickCount === 1 ? "click" : "clicks"}`;

  return (
    <div
      className="relative mx-auto w-full max-w-[300px] transition-transform duration-150 ease-out hover:-translate-y-[3px] has-[a:focus-visible]:-translate-y-[3px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The folder is the card: the name and counts are written on its glass. */}
      <h3>
        <NavLink
          to={href}
          aria-label={`${collection.name}, ${links}, ${clicks}`}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="focus-visible:ring-accent/50 block rounded-[22px] transition-transform outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2 active:scale-[0.99]"
        >
          <GlassFolder
            previewUrls={collection.previewUrls}
            color={collectionColor}
            label={collection.name}
            meta={`${links} · ${clicks}`}
            hovered={hovered || focused}
            lift={false}
          />
        </NavLink>
      </h3>
      {/* Sits on the glass, outside the link, in the label's ink. */}
      <div
        className="absolute top-[37%] right-[3%]"
        style={{ color: glassTone(collectionColor).ink }}
      >
        <CollectionMenuCell
          collection={collection}
          onView={onView}
          onDeleteClick={onDeleteClick}
        />
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
        <div className="grid gap-x-6 gap-y-12 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

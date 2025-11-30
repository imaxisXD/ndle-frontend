"use client";

import { useState, useCallback } from "react";
import { Badge } from "@ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardToolbar,
  CardHeading,
  CardFooter,
} from "@ui/card";
import {
  Folder,
  MoreVertCircle,
  BinMinusIn,
  Page,
  KeyCommand,
} from "iconoir-react";
import { CreateCollectionButton } from "./create-collection-button";
import { COLLECTION_COLORS } from "./colors";
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
            className="hover:bg-accent rounded-md p-1 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
          >
            <MoreVertCircle className="h-4 w-4" />
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
            <KeyCommand className="size-2.5 text-white" strokeWidth="2" /> V
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
            <KeyCommand className="size-2.5 text-white" strokeWidth="2" />D
          </MenuShortcut>
        </MenuItem>
      </MenuContent>
    </Menu>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {collections?.map((collection, index) => {
          const fallbackIndex = index % COLLECTION_COLORS.length;
          const collectionColor =
            collection.collectionColor || COLLECTION_COLORS[fallbackIndex];

          return (
            <Card
              variant="accent"
              key={collection.id}
              className="group hover:border-accent border-border cursor-pointer border transition-all duration-100 ease-in-out hover:border-dashed hover:shadow-[0px_0px_0px_4px_#ffca0026]"
            >
              <CardHeader className="flex items-center">
                <NavLink
                  to={`/collection/${collection.id}`}
                  tabIndex={0}
                  className="flex-1"
                >
                  <CardHeading className="flex items-center gap-2">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: collectionColor + "20" }}
                    >
                      <Folder
                        className="h-5 w-5"
                        style={{ color: collectionColor }}
                      />
                    </div>
                    <CardTitle className="font-medium">
                      {collection.name}
                    </CardTitle>
                  </CardHeading>
                </NavLink>
                <CardToolbar>
                  <CollectionMenuCell
                    collection={collection}
                    onView={handleView}
                    onDeleteClick={handleDeleteClick}
                  />
                </CardToolbar>
              </CardHeader>

              <NavLink
                to={`/collection/${collection.id}`}
                tabIndex={0}
                className="block"
              >
                <CardContent className="px-5 pb-0.5">
                  <CardDescription className="mb-5 line-clamp-2 h-[2lh] text-xs">
                    {collection.description || "No description given"}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">
                      [{collection.urlCount}]{" "}
                      <span className="text-muted-foreground pl-1 text-xs">
                        {collection.urlCount > 1 ? "links" : "link"}
                      </span>
                    </Badge>
                    <Badge variant="default">
                      [{collection.totalClickCount}]{" "}
                      <span className="text-muted-foreground pl-1 text-xs">
                        {collection.totalClickCount > 1 ? "clicks" : "click"}
                      </span>
                    </Badge>
                  </div>
                </CardFooter>
              </NavLink>
            </Card>
          );
        })}
      </div>

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

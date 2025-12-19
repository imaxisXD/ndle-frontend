import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache/hooks";
import { UseFormReturn } from "react-hook-form";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/base-tooltip";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxIcon,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/base-combobox";
import { ColorSelector } from "@/components/collection/ColorSelector";
import {
  COLLECTION_COLORS,
  getRandomCollectionColor,
} from "@/components/collection/colors";
import { getWindowsFolderNameError } from "@/lib/utils";
import {
  NavArrowDown,
  Folder,
  HelpCircle,
  EditPencil,
  Check,
} from "iconoir-react";
import { FolderPlusIcon } from "@phosphor-icons/react";
import type { UrlFormValues } from "../url-shortener";

type CollectionOption = {
  id: string;
  name: string;
  color?: string;
};

const NONE_VALUE = "none";

export function OptionOrganization({
  form,
}: {
  form: UseFormReturn<UrlFormValues>;
}) {
  const tags: string[] = form.watch("tags") || [];
  const [tagEntry, setTagEntry] = useState("");

  const collections = useQuery(api.collectionMangament.getUserCollections);
  const createCollection = useMutation(
    api.collectionMangament.createCollection,
  );

  const selectedCollectionId: string | undefined =
    form.watch("collectionId") || undefined;
  const pendingNewName: string = form.watch("newCollectionName") || "";
  const pendingNewColor: string = form.watch("newCollectionColor") || "";
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  const collectionOptions: CollectionOption[] = useMemo(() => {
    const data = collections || [];
    return data.map((c) => ({
      id: c.id as string,
      name: c.name as string,
      color: c.collectionColor as string | undefined,
    }));
  }, [collections]);

  const activeLabel = useMemo(() => {
    if (selectedCollectionId) {
      const match = collectionOptions.find(
        (c) => c.id === selectedCollectionId,
      );
      return match?.name ?? "Selected folder";
    }
    if (pendingNewName.trim()) return `Create "${pendingNewName.trim()}"`;
    return "Select collection";
  }, [selectedCollectionId, pendingNewName, collectionOptions]);

  const selectedCollection = useMemo(() => {
    if (selectedCollectionId) {
      return collectionOptions.find((c) => c.id === selectedCollectionId);
    }
    return null;
  }, [selectedCollectionId, collectionOptions]);

  const addTag = () => {
    const t = tagEntry.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    form.setValue("tags", [...tags, t], { shouldDirty: true });
    setTagEntry("");
  };

  const removeTag = (val: string) => {
    form.setValue(
      "tags",
      tags.filter((t) => t !== val),
      { shouldDirty: true },
    );
  };

  const resetNewCollectionFields = () => {
    form.setValue("newCollectionName", "", { shouldDirty: true });
    form.setValue("newCollectionColor", "", { shouldDirty: true });
  };

  const handleSelectExisting = (id: string | null) => {
    form.setValue("collectionId", id || undefined, { shouldDirty: true });
    resetNewCollectionFields();
    setNameError(null);
    setComboboxOpen(false);
  };

  const handleChooseCreate = (name: string) => {
    const err = getWindowsFolderNameError(name);
    if (err) {
      setNameError(err);
      return;
    }
    setNameError(null);
    form.setValue("collectionId", undefined, { shouldDirty: true });
    form.setValue("newCollectionName", name.trim(), { shouldDirty: true });
    if (!form.getValues("newCollectionColor")) {
      form.setValue("newCollectionColor", getRandomCollectionColor(), {
        shouldDirty: true,
      });
    }
    setComboboxOpen(false);
  };

  const handleCreateNow = async () => {
    const name = pendingNewName.trim();
    if (!name) return;
    const err = getWindowsFolderNameError(name);
    if (err) {
      setNameError(err);
      return;
    }
    setCreating(true);
    try {
      const color = pendingNewColor || getRandomCollectionColor();
      const newId = await createCollection({
        name,
        description: "",
        collectionColor: color,
      });
      form.setValue("collectionId", newId, { shouldDirty: true });
      resetNewCollectionFields();
    } finally {
      setCreating(false);
    }
  };

  const filteredOptions = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return collectionOptions;
    return collectionOptions.filter((opt) =>
      opt.name.toLowerCase().includes(q),
    );
  }, [collectionOptions, searchValue]);

  const hasExactMatch = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return true;
    return collectionOptions.some((opt) => opt.name.trim().toLowerCase() === q);
  }, [collectionOptions, searchValue]);

  return (
    <div className="border-border bg-muted/20 space-y-5 rounded-lg border p-4">
      {/* Collection selector */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <div className="text-xs font-medium">Collection</div>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="text-muted-foreground h-3.5 w-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Organize your link by assigning it to a collection</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <Combobox
          open={comboboxOpen}
          onOpenChange={setComboboxOpen}
          value={selectedCollectionId ?? NONE_VALUE}
          onValueChange={(val) => {
            const strVal = val as string;
            if (
              strVal &&
              strVal !== NONE_VALUE &&
              !strVal.startsWith("create:")
            ) {
              handleSelectExisting(strVal);
            }
          }}
        >
          <ComboboxTrigger className="border-border hover:border-accent focus-visible:border-accent focus-visible:ring-accent/30 flex w-full items-center gap-2.5 rounded-md border bg-white px-3 py-2 text-left text-sm shadow-xs shadow-black/5 transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-none">
            <ComboboxValue>
              {() =>
                selectedCollection ? (
                  <>
                    <div
                      className="flex size-6 shrink-0 items-center justify-center rounded-xs"
                      style={{
                        backgroundColor:
                          (selectedCollection.color || "#3b82f6") + "20",
                      }}
                    >
                      <Folder
                        className="size-5"
                        style={{
                          color: selectedCollection.color || "#3b82f6",
                        }}
                      />
                    </div>
                    <span className="flex-1 truncate font-medium">
                      {selectedCollection.name}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="bg-muted/30 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                      <Folder className="text-muted-foreground h-4 w-4" />
                    </div>
                    <span className="text-muted-foreground flex-1 truncate">
                      {activeLabel}
                    </span>
                  </>
                )
              }
            </ComboboxValue>
            <ComboboxIcon>
              <NavArrowDown className="text-muted-foreground h-4 w-4 shrink-0 opacity-60" />
            </ComboboxIcon>
          </ComboboxTrigger>

          <ComboboxContent className="pt-0">
            <div className="p-2">
              <ComboboxInput
                placeholder="Search collections"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                variant="md"
              />
            </div>
            <ComboboxList className="max-h-[300px] overflow-y-auto">
              {filteredOptions.length === 0 && !searchValue.trim() && (
                <div className="text-muted-foreground px-3 py-2 text-xs">
                  No collections yet
                </div>
              )}
              {filteredOptions.length === 0 && searchValue.trim() && (
                <div className="text-muted-foreground px-3 py-2 text-xs">
                  No collections match &ldquo;{searchValue.trim()}&rdquo;
                </div>
              )}
              {filteredOptions.map((opt) => (
                <ComboboxItem
                  key={opt.id}
                  value={opt.id}
                  onClick={() => handleSelectExisting(opt.id)}
                  className="flex items-center justify-between px-3 py-2 ps-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded"
                      style={{
                        backgroundColor: (opt.color || "#3b82f6") + "20",
                      }}
                    >
                      <Folder
                        className="h-3.5 w-3.5"
                        style={{ color: opt.color || "#3b82f6" }}
                      />
                    </div>
                    <span className="flex-1 truncate font-medium">
                      {opt.name}
                    </span>
                  </div>
                  <ComboboxItemIndicator className="static mr-4 translate-y-0" />
                </ComboboxItem>
              ))}

              {/* Show create option when typing something that doesn't exist */}
              {!hasExactMatch && searchValue.trim().length > 0 && (
                <ComboboxItem
                  value={`create:${searchValue.trim()}`}
                  onClick={() => handleChooseCreate(searchValue)}
                  className="border-border/50 flex items-center gap-2.5 rounded-none px-2 py-2 pl-7 text-sm"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded bg-linear-to-br from-black to-black/70">
                    <FolderPlusIcon
                      weight="fill"
                      className="text-accent size-4"
                    />
                  </div>

                  <span className="flex-1 truncate">
                    Create &ldquo;{searchValue.trim()}&rdquo; collection
                  </span>
                </ComboboxItem>
              )}

              {/* Show general create option when not typing */}
              {!searchValue.trim() && (
                <ComboboxItem
                  value="create:new"
                  onClick={() => {
                    handleChooseCreate("New Collection");
                  }}
                  className="mt-2 flex items-center justify-between border-t border-dashed px-3 py-2 ps-3 text-sm"
                >
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-xs bg-linear-to-br from-black to-black/70">
                    <FolderPlusIcon
                      weight="fill"
                      className="text-accent size-3.5"
                    />
                  </div>
                  <span className="flex-1 truncate text-left">
                    Create new collection
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
          {nameError && (
            <p className="text-destructive mt-2 text-xs leading-tight">
              {nameError}
            </p>
          )}
        </Combobox>
        {pendingNewName && (
          <Card
            variant="accent"
            className="border-border/70 border border-dashed bg-white shadow-none"
          >
            <CardHeader className="min-h-0 border-b-0 px-3 py-2.5">
              <CardTitle className="text-xs font-medium">
                Creating new collection
              </CardTitle>
              <div className="flex items-center gap-1.5">
                {isEditingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      id="edit-collection-name"
                      name="editCollectionName"
                      value={editNameValue}
                      onChange={(e) => setEditNameValue(e.target.value)}
                      className="h-7 w-32 text-xs"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const err = getWindowsFolderNameError(editNameValue);
                          if (err) {
                            setNameError(err);
                            return;
                          }
                          setNameError(null);
                          form.setValue(
                            "newCollectionName",
                            editNameValue.trim(),
                            {
                              shouldDirty: true,
                            },
                          );
                          setIsEditingName(false);
                        }
                        if (e.key === "Escape") {
                          setIsEditingName(false);
                          setEditNameValue(pendingNewName);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        const err = getWindowsFolderNameError(editNameValue);
                        if (err) {
                          setNameError(err);
                          return;
                        }
                        setNameError(null);
                        form.setValue(
                          "newCollectionName",
                          editNameValue.trim(),
                          {
                            shouldDirty: true,
                          },
                        );
                        setIsEditingName(false);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Badge variant="default">{pendingNewName}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setEditNameValue(pendingNewName);
                        setIsEditingName(true);
                      }}
                    >
                      <EditPencil className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 px-3">
              <FormLabel className="text-xs">
                Choose collection color:
              </FormLabel>
              <ColorSelector
                value={pendingNewColor || COLLECTION_COLORS[0]}
                colors={COLLECTION_COLORS}
                onChange={(val) =>
                  form.setValue("newCollectionColor", val, {
                    shouldDirty: true,
                  })
                }
              />
            </CardContent>
            <CardFooter className="mt-0 min-h-0 gap-2 border-t-0 px-3 py-2.5">
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={handleCreateNow}
                disabled={creating}
              >
                {creating ? "Creating" : "Create & assign"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => resetNewCollectionFields()}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <div>
          <div className="text-muted-foreground mb-2 text-xs">Tags</div>
          <div className="flex items-center gap-2">
            <Input
              id="add-tag-input"
              name="tagEntry"
              placeholder="Add a tag and press Enter"
              value={tagEntry}
              onChange={(e) => setTagEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <Button type="button" size="sm" onClick={addTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge
                  key={t}
                  variant="default"
                  className="cursor-pointer"
                  onClick={() => removeTag(t)}
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="Internal notes&" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Link as LinkIcon } from "iconoir-react";

interface UrlPickerTableProps {
  collectionId: Id<"collections">;
  onClose?: () => void;
}

export function UrlPickerTable({ collectionId, onClose }: UrlPickerTableProps) {
  const { add } = useToast();
  const availableUrls = useQuery(
    api.collectionMangament.getUserUrlsNotInCollection,
    { collectionId },
  );
  const addUrlToCollection = useMutation(
    api.collectionMangament.addUrlToCollection,
  );

  const [selected, setSelected] = useState<Set<Id<"urls">>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!availableUrls) return [];
    if (!search) return availableUrls;
    const q = search.toLowerCase();
    return availableUrls.filter(
      (u) =>
        (u.slugAssigned || u.shortUrl).toLowerCase().includes(q) ||
        u.fullurl.toLowerCase().includes(q),
    );
  }, [availableUrls, search]);

  const allIds = useMemo(() => filtered.map((u) => u._id), [filtered]);
  const isAllSelected = useMemo(
    () => allIds.length > 0 && allIds.every((id) => selected.has(id)),
    [allIds, selected],
  );
  const isIndeterminate = useMemo(
    () => selected.size > 0 && !isAllSelected,
    [selected, isAllSelected],
  );

  const toggleAll = () => {
    if (!availableUrls || availableUrls.length === 0) return;
    if (isAllSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allIds));
    }
  };

  const toggleOne = (id: Id<"urls">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (!availableUrls || selected.size === 0) return;
    setIsSubmitting(true);
    try {
      for (const urlId of selected) {
        await addUrlToCollection({ collectionId, urlId });
      }
      add({
        type: "success",
        title: "Added",
        description: `${selected.size} URL(s) added to collection`,
      });
      setSelected(new Set());
      onClose?.();
    } catch (e) {
      add({
        type: "error",
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to add URLs",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (availableUrls === undefined) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm font-medium">Loading URLs…</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Fetching your available links
        </p>
      </div>
    );
  }

  if (!availableUrls || availableUrls.length === 0) {
    return (
      <div className="border-border bg-muted/30 rounded-lg border border-dashed p-8 text-center">
        <LinkIcon className="text-muted-foreground mx-auto mb-4 h-8 w-8" />
        <h3 className="mb-1 text-sm font-medium">No URLs Available</h3>
        <p className="text-muted-foreground text-xs">
          All your URLs are already in this collection, or you haven&apos;t
          created any yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm">Selected: {selected.size}</div>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => onClose?.()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={selected.size === 0 || isSubmitting}
          >
            Add {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </div>
      </div>
      <div className="px-1">
        <input
          className="border-input bg-background focus:ring-foreground/20 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
          placeholder="Search by short or original URL…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="max-h-4/5 overflow-auto rounded-lg border">
        <Table style={{ tableLayout: "fixed", width: "100%" }}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4">
                <Checkbox
                  aria-label="Select all"
                  checked={isAllSelected}
                  data-invalid={false}
                  onCheckedChange={toggleAll}
                  {...(isIndeterminate
                    ? { "data-state": "indeterminate" }
                    : {})}
                />
              </TableHead>
              <TableHead className="px-4">Short</TableHead>
              <TableHead className="px-4">Original</TableHead>
              <TableHead className="px-4">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((u) => {
              const short = u.slugAssigned || u.shortUrl;
              return (
                <TableRow key={u._id} className="hover:bg-muted/50">
                  <TableCell className="px-4">
                    <Checkbox
                      aria-label="Select row"
                      checked={selected.has(u._id)}
                      onCheckedChange={() => toggleOne(u._id)}
                    />
                  </TableCell>
                  <TableCell className="px-4">
                    <code className="text-xs font-medium">{short}</code>
                  </TableCell>
                  <TableCell className="px-4">
                    <p
                      className="text-muted-foreground truncate text-xs"
                      title={u.fullurl}
                    >
                      {u.fullurl}
                    </p>
                  </TableCell>
                  <TableCell className="text-muted-foreground px-4 text-xs">
                    {formatRelative(u._creationTime)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default UrlPickerTable;

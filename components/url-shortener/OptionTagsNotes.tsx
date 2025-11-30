"use client";

import { useState } from "react";
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

export function OptionTagsNotes({ form }: { form: any }) {
  const tags: string[] = form.watch("tags") || [];
  const [entry, setEntry] = useState("");

  const addTag = () => {
    const t = entry.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    form.setValue("tags", [...tags, t], { shouldDirty: true });
    setEntry("");
  };

  const removeTag = (val: string) => {
    form.setValue(
      "tags",
      tags.filter((t) => t !== val),
      { shouldDirty: true },
    );
  };

  return (
    <div className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="mt-4 space-y-3">
        <div>
          <div className="text-muted-foreground mb-2 text-xs">Tags</div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a tag and press Enter"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
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

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Internal notes…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

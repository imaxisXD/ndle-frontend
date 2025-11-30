"use client";

import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

export function OptionSocial({ form }: { form: any }) {
  const title = form.watch("socialTitle");
  const description = form.watch("socialDescription");
  const image = form.watch("socialImageUrl");

  return (
    <div className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="socialTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Awesome landing page" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="socialImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Image URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/og.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="socialDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Input placeholder="Catchy preview description" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="rounded-md bg-white p-3">
        <div className="text-muted-foreground mb-2 text-xs">Preview</div>
        <div className="flex gap-3">
          <div className="bg-muted h-16 w-28 flex-shrink-0 overflow-hidden rounded">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt="og"
                className="h-full w-full object-cover"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {title || "Title"}
            </div>
            <div className="text-muted-foreground line-clamp-2 text-xs">
              {description || "Description"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

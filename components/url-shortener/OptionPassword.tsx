"use client";

import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

export function OptionPassword({ form }: { form: any }) {
  return (
    <div className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="passwordHint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hint (optional)</FormLabel>
              <FormControl>
                <Input placeholder="E.g., Our shared project name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

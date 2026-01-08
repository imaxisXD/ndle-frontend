"use client";

import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { UseFormReturn } from "react-hook-form";
import type { UrlFormValues } from "../url-shortener";

export function OptionFallback({
  form,
}: {
  form: UseFormReturn<UrlFormValues>;
}) {
  return (
    <div className="border-border bg-muted/20 space-y-4 rounded-lg border p-4">
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="healthCheckUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Health check URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://status.example.com/ping"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fallbackUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fallback URL</FormLabel>
              <FormControl>
                <Input placeholder="https://backup.example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="retryCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retry count</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={field.value ?? 1}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="retryIntervalMs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retry interval (ms)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={100}
                  step={100}
                  value={field.value ?? 1000}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

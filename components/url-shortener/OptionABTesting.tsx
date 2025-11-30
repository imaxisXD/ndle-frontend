"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

type Variant = { url?: string; weight?: number };

export function OptionABTesting({ form }: { form: any }) {
  const variants: Variant[] = form.watch("abVariants") || [];

  const totalWeight = useMemo(() => {
    return variants.reduce((sum, v) => sum + (Number(v.weight) || 0), 0);
  }, [variants]);

  const addVariant = () => {
    if (variants.length >= 5) return;
    const next = [...variants, { url: "", weight: 0 }];
    form.setValue("abVariants", next, { shouldDirty: true });
  };

  const removeVariant = (index: number) => {
    const next = variants.filter((_, i) => i !== index);
    form.setValue("abVariants", next, { shouldDirty: true });
  };

  const evenSplit = () => {
    if (variants.length === 0) return;
    const even = Math.floor(100 / variants.length);
    const remainder = 100 - even * variants.length;
    const next = variants.map((v, i) => ({
      ...v,
      weight: even + (i === 0 ? remainder : 0),
    }));
    form.setValue("abVariants", next, { shouldDirty: true });
  };

  return (
    <div className="space-y-4">
      <div className="mt-0 space-y-3">
        {variants.map((_, idx) => (
          <div key={idx} className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-8">
              <FormField
                control={form.control}
                name={`abVariants.${idx}.url`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Variant {idx + 1} URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/variant"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="md:col-span-3">
              <FormField
                control={form.control}
                name={`abVariants.${idx}.weight`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        placeholder="50"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-end md:col-span-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => removeVariant(idx)}
                disabled={variants.length <= 1}
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={addVariant}
          disabled={variants.length >= 5}
        >
          Add variant
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={evenSplit}
          disabled={variants.length === 0}
        >
          Even split
        </Button>
        <div className="text-muted-foreground text-xs">
          Total weight: {totalWeight}%
        </div>
      </div>
    </div>
  );
}

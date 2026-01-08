"use client";

import { useMemo, useCallback } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFavicon } from "@/hooks/use-favicon";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { UrlFormValues } from "../url-shortener";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";

type Variant = { url?: string; weight?: number };

function VariantRow({
  form,
  index,
  variantLabel,
  onRemove,
  canRemove,
  hasDuplicateError,
}: {
  form: UseFormReturn<UrlFormValues>;
  index: number;
  variantLabel: string;
  onRemove: () => void;
  canRemove: boolean;
  hasDuplicateError?: boolean;
}) {
  const variantUrl =
    useWatch({
      control: form.control,
      name: `abVariants.${index}.url` as const,
    }) || "";

  // Compute validated URL directly from the watched value
  const validatedUrl = useMemo(() => {
    const trimmed = variantUrl.trim();
    if (!trimmed) return null;
    try {
      const normalized = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;
      new URL(normalized);
      return normalized;
    } catch {
      return null;
    }
  }, [variantUrl]);

  const { faviconUrl } = useFavicon(validatedUrl);

  return (
    <div className="flex items-start gap-3">
      {/* URL Input with Favicon */}
      <div className="flex-1">
        <FormField
          control={form.control}
          name={`abVariants.${index}.url`}
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground text-xs">
                {variantLabel}
              </FormLabel>
              <FormControl>
                <div className="relative">
                  {/* Favicon overlay */}
                  <div
                    className={cn(
                      "absolute top-1/2 left-3 -translate-y-1/2 transition-all duration-200",
                      faviconUrl ? "opacity-100" : "opacity-0",
                    )}
                  >
                    {faviconUrl && (
                      <Image
                        src={faviconUrl}
                        alt=""
                        width={16}
                        height={16}
                        className="size-4 rounded"
                        unoptimized
                      />
                    )}
                  </div>
                  <Input
                    placeholder="https://example.com/variant"
                    className={cn(
                      "transition-all duration-200",
                      faviconUrl ? "pl-9" : "pl-3",
                      hasDuplicateError &&
                        "border-destructive focus-visible:ring-destructive/30",
                    )}
                    aria-invalid={fieldState.invalid || hasDuplicateError}
                    {...field}
                    onBlur={field.onBlur}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Weight Input */}
      <div className="w-24">
        <FormField
          control={form.control}
          name={`abVariants.${index}.weight`}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-muted-foreground text-xs">
                Split %
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    inputMode="numeric"
                    placeholder="50"
                    className="pr-7 text-right font-mono"
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                  <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-xs">
                    %
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Remove Button */}
      <div className="flex items-end pt-6">
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive h-9 w-9"
            onClick={onRemove}
          >
            <TrashIcon size={16} />
            <span className="sr-only">Remove</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export function OptionABTesting({
  form,
}: {
  form: UseFormReturn<UrlFormValues>;
}) {
  const variantsRaw = useWatch({ control: form.control, name: "abVariants" });

  // Calculate total variant traffic (Original gets 100 - this)
  const { totalVariantWeight, variants } = useMemo(() => {
    const v: Variant[] = variantsRaw || [];
    const total = v.reduce(
      (sum, variant) => sum + (Number(variant.weight) || 0),
      0,
    );
    return { totalVariantWeight: total, variants: v };
  }, [variantsRaw]);

  const originalWeight = Math.max(0, 100 - totalVariantWeight);

  const addVariant = useCallback(() => {
    if (variants.length >= 4) return;

    // Redistribute: test variants share 50% total
    const newCount = variants.length + 1;
    const each = Math.floor(50 / newCount);

    const redistributed = variants.map((v) => ({
      ...v,
      weight: each,
    }));

    // Give remainder to first variant
    const total = each * newCount;
    if (total < 50 && redistributed.length > 0) {
      redistributed[0].weight = each + (50 - total);
    }

    const next = [...redistributed, { url: "", weight: each }];
    form.setValue("abVariants", next, { shouldDirty: true });
  }, [variants, form]);

  const removeVariant = useCallback(
    (index: number) => {
      const next = variants.filter((_, i) => i !== index);

      if (next.length === 1) {
        next[0].weight = 50;
      } else if (next.length > 1) {
        const each = Math.floor(50 / next.length);
        const remainder = 50 - each * next.length;
        next.forEach((v, i) => {
          v.weight = each + (i === 0 ? remainder : 0);
        });
      }

      form.setValue("abVariants", next, { shouldDirty: true });
    },
    [variants, form],
  );

  // Get main URL from form for display
  const mainUrl = useWatch({ control: form.control, name: "url" }) || "";
  const mainUrlForFavicon = useMemo(() => {
    if (!mainUrl?.trim()) return null;
    try {
      const normalized = /^https?:\/\//i.test(mainUrl)
        ? mainUrl
        : `https://${mainUrl}`;
      new URL(normalized);
      return normalized;
    } catch {
      return null;
    }
  }, [mainUrl]);
  const { faviconUrl: mainFaviconUrl } = useFavicon(mainUrlForFavicon);

  // Format URL for display (strip protocol)
  const displayMainUrl = mainUrl.replace(/^https?:\/\//i, "");

  // Normalize URL for comparison (strip protocol and trailing slash)
  const normalizeForComparison = (url: string) => {
    return url
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/\/$/, "");
  };

  // Check for duplicate URLs - returns both error message and affected indices
  const duplicateCheck = useMemo(() => {
    const normalizedMainUrl = normalizeForComparison(mainUrl);
    const variantUrls = variants.map((v) =>
      normalizeForComparison(v.url || ""),
    );
    const duplicateIndices = new Set<number>();
    let errorMessage: string | null = null;

    // Check if any variant matches the main URL
    for (let i = 0; i < variantUrls.length; i++) {
      if (variantUrls[i] && variantUrls[i] === normalizedMainUrl) {
        duplicateIndices.add(i);
        if (!errorMessage) {
          errorMessage = `Variant ${String.fromCharCode(66 + i)} cannot be the same as the original link`;
        }
      }
    }

    // Check if any variants match each other
    for (let i = 0; i < variantUrls.length; i++) {
      if (!variantUrls[i]) continue;
      for (let j = i + 1; j < variantUrls.length; j++) {
        if (variantUrls[i] === variantUrls[j]) {
          duplicateIndices.add(i);
          duplicateIndices.add(j);
          if (!errorMessage) {
            errorMessage = `Variant ${String.fromCharCode(66 + i)} and Variant ${String.fromCharCode(66 + j)} cannot have the same URL`;
          }
        }
      }
    }

    return { errorMessage, duplicateIndices };
  }, [mainUrl, variants]);

  const duplicateError = duplicateCheck.errorMessage;

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {duplicateError && (
        <div className="bg-destructive/10 border-destructive/30 text-destructive flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4 shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {duplicateError}
        </div>
      )}

      {/* Original Link Info */}
      <div className="border-border/50 bg-muted/20 flex items-center justify-between rounded-lg border px-4 py-2.5">
        <div className="flex items-center gap-2 overflow-hidden">
          {mainFaviconUrl ? (
            <Image
              src={mainFaviconUrl}
              alt=""
              width={16}
              height={16}
              className="size-4 shrink-0 rounded"
              unoptimized
            />
          ) : (
            <div className="bg-primary size-1.5 shrink-0 rounded-full" />
          )}
          <span className="truncate text-sm font-medium">
            {displayMainUrl || "Original Link"}
          </span>
        </div>
        <div
          className={cn(
            "shrink-0 font-mono text-sm font-medium",
            originalWeight >= 50 ? "text-foreground" : "text-amber-600",
          )}
        >
          {originalWeight}%
        </div>
      </div>

      {/* Variant Rows */}
      <div className="space-y-4">
        {variants.map((_, idx) => (
          <VariantRow
            key={idx}
            form={form}
            index={idx}
            variantLabel={`Variant ${String.fromCharCode(66 + idx)}`}
            onRemove={() => removeVariant(idx)}
            canRemove={variants.length > 1}
            hasDuplicateError={duplicateCheck.duplicateIndices.has(idx)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={addVariant}
          disabled={variants.length >= 4}
          className="h-8 gap-1.5 text-xs"
        >
          <PlusIcon size={14} weight="bold" />
          Add Variant
        </Button>

        <div className="text-muted-foreground ml-auto text-xs">
          Total:{" "}
          <span
            className={cn(
              "font-mono font-medium",
              totalVariantWeight + originalWeight === 100
                ? "text-emerald-600"
                : "text-destructive",
            )}
          >
            {totalVariantWeight + originalWeight}%
          </span>
        </div>
      </div>
    </div>
  );
}

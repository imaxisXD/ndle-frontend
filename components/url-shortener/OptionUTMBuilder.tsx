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

function buildUtmUrl(baseUrl: string, params: Record<string, string>) {
  try {
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([k, v]) => {
      if (v && v.trim() !== "") url.searchParams.set(k, v.trim());
    });
    return url.toString();
  } catch (_) {
    return "";
  }
}

export function OptionUTMBuilder({ form }: { form: any }) {
  const currentUrl = form.watch("url");
  const utmSource = form.watch("utmSource");
  const utmMedium = form.watch("utmMedium");
  const utmCampaign = form.watch("utmCampaign");
  const utmTerm = form.watch("utmTerm");
  const utmContent = form.watch("utmContent");

  const preview = useMemo(() => {
    if (!currentUrl) return "";
    return buildUtmUrl(currentUrl, {
      utm_source: utmSource || "",
      utm_medium: utmMedium || "",
      utm_campaign: utmCampaign || "",
      utm_term: utmTerm || "",
      utm_content: utmContent || "",
    });
  }, [currentUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);

  const applyToUrl = () => {
    if (!preview) return;
    form.setValue("url", preview, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div>
      <div className="mt-0 grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormField
          control={form.control}
          name="utmSource"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_source</FormLabel>
              <FormControl>
                <Input placeholder="newsletter" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="utmMedium"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_medium</FormLabel>
              <FormControl>
                <Input placeholder="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="utmCampaign"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_campaign</FormLabel>
              <FormControl>
                <Input placeholder="spring_sale" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="utmTerm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_term</FormLabel>
              <FormControl>
                <Input placeholder="shoes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="utmContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_content</FormLabel>
              <FormControl>
                <Input placeholder="cta_button" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="rounded-md bg-white/70 p-3 text-xs">
        <div className="text-muted-foreground mb-1">Preview</div>
        <div className="break-all">
          {preview || "Enter a valid base URL above"}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={applyToUrl}
          disabled={!preview}
        >
          Apply to URL
        </Button>
      </div>
    </div>
  );
}

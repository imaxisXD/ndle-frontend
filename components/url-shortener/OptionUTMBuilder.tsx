"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { UrlFormValues } from "../url-shortener";

// Common UTM source presets
const SOURCE_PRESETS = [
  { value: "", label: "Custom..." },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "twitter", label: "Twitter / X" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "newsletter", label: "Newsletter" },
  { value: "email", label: "Email" },
];

// Common UTM medium presets
const MEDIUM_PRESETS = [
  { value: "", label: "Custom..." },
  { value: "cpc", label: "CPC (Pay-per-click)" },
  { value: "email", label: "Email" },
  { value: "social", label: "Social" },
  { value: "organic", label: "Organic" },
  { value: "referral", label: "Referral" },
  { value: "display", label: "Display" },
  { value: "affiliate", label: "Affiliate" },
  { value: "banner", label: "Banner" },
];

function buildUtmUrl(baseUrl: string, params: Record<string, string>) {
  try {
    // Add protocol if missing
    let urlString = baseUrl;
    if (!/^https?:\/\//i.test(urlString)) {
      urlString = `https://${urlString}`;
    }
    const url = new URL(urlString);
    Object.entries(params).forEach(([k, v]) => {
      if (v && v.trim() !== "") url.searchParams.set(k, v.trim());
    });
    return url.toString();
  } catch {
    return "";
  }
}

export function OptionUTMBuilder({
  form,
}: {
  form: UseFormReturn<UrlFormValues>;
}) {
  const currentUrl = useWatch({ control: form.control, name: "url" });
  const utmSource = useWatch({ control: form.control, name: "utmSource" });
  const utmMedium = useWatch({ control: form.control, name: "utmMedium" });
  const utmCampaign = useWatch({ control: form.control, name: "utmCampaign" });
  const utmTerm = useWatch({ control: form.control, name: "utmTerm" });
  const utmContent = useWatch({ control: form.control, name: "utmContent" });

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

  const hasAnyUtm =
    utmSource || utmMedium || utmCampaign || utmTerm || utmContent;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* UTM Source with preset dropdown */}
        <FormField
          control={form.control}
          name="utmSource"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_source *</FormLabel>
              <div className="flex gap-2">
                <Select
                  value={
                    SOURCE_PRESETS.some((p) => p.value === field.value)
                      ? field.value
                      : ""
                  }
                  onValueChange={(val) => {
                    if (val) field.onChange(val);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_PRESETS.map((preset) => (
                      <SelectItem
                        key={preset.value || "custom"}
                        value={preset.value || "CUSTOM_PLACEHOLDER"}
                      >
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormControl>
                  <Input
                    placeholder="e.g. google, newsletter"
                    {...field}
                    className="flex-1"
                  />
                </FormControl>
              </div>
              <FormDescription className="text-xs">
                Where the traffic is coming from
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* UTM Medium with preset dropdown */}
        <FormField
          control={form.control}
          name="utmMedium"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_medium *</FormLabel>
              <div className="flex gap-2">
                <Select
                  value={
                    MEDIUM_PRESETS.some((p) => p.value === field.value)
                      ? field.value
                      : ""
                  }
                  onValueChange={(val) => {
                    if (val) field.onChange(val);
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEDIUM_PRESETS.map((preset) => (
                      <SelectItem
                        key={preset.value || "custom"}
                        value={preset.value || "CUSTOM_PLACEHOLDER"}
                      >
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormControl>
                  <Input
                    placeholder="e.g. cpc, email, social"
                    {...field}
                    className="flex-1"
                  />
                </FormControl>
              </div>
              <FormDescription className="text-xs">
                The marketing medium or channel
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* UTM Campaign */}
        <FormField
          control={form.control}
          name="utmCampaign"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_campaign *</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. spring_sale, product_launch"
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs">
                The specific campaign name
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* UTM Term */}
        <FormField
          control={form.control}
          name="utmTerm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>utm_term</FormLabel>
              <FormControl>
                <Input placeholder="e.g. running+shoes" {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                Paid search keywords (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* UTM Content */}
        <FormField
          control={form.control}
          name="utmContent"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>utm_content</FormLabel>
              <FormControl>
                <Input placeholder="e.g. cta_button, hero_banner" {...field} />
              </FormControl>
              <FormDescription className="text-xs">
                Differentiate similar content or links (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Preview - now shows the redirect destination */}
      {hasAnyUtm && (
        <div className="rounded-md border border-green-200 bg-green-50/50 p-3 text-xs">
          <div className="text-muted-foreground mb-1 flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
            Visitors will be redirected to:
          </div>
          <div className="font-mono break-all text-green-800">
            {preview || "Enter a valid base URL above"}
          </div>
        </div>
      )}

      <div className="rounded-md border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800">
        <strong>How it works:</strong> UTM parameters are automatically appended
        when someone clicks your short link. Your original destination URL stays
        clean, and you&apos;ll see detailed campaign analytics in your
        dashboard.
      </div>
    </div>
  );
}

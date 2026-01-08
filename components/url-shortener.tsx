"use client";

import { useMemo, useState } from "react";
import Image from "next/image";

import { CircleGridLoaderIcon } from "./icons";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ConvexError } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import validator from "validator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { ShimmeringPhrases } from "./ui/shimmering-phrases";
import { getShortDomain } from "@/lib/config";
import { HotkeyButton } from "./ui/hotkey-button";
import { Badge } from "@/components/ui/badge";
import { AdvancedOptions } from "./url-shortener/AdvancedOptions";
import { getRandomCollectionColor } from "@/components/collection/colors";
import { trackUrlCreated, trackAdvancedOptionsOpened } from "@/lib/posthog";
import { useFavicon } from "@/hooks/use-favicon";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

const urlFormSchema = z
  .object({
    url: z
      .string()
      .trim()
      .min(1, "Link is required")
      .refine(
        (val) => {
          if (!val) return true;
          return validator.isURL(val, {
            protocols: ["http", "https"],
            require_protocol: false,
            require_valid_protocol: true,
          });
        },
        {
          message: "Please enter a valid link",
        },
      ),
    shortUrl: z.string().optional(),
    slugMode: z.enum(["random", "human"]),
    // Scheduling / Expiration
    expiresEnabled: z.boolean(),
    expiresAt: z.string().optional(),
    expireMode: z
      .enum(["none", "datetime", "totalClicks", "duration", "inactivity"])
      .optional(),
    expireTotalClicks: z.number().optional(),
    expireDurationAmount: z.number().optional(),
    expireDurationUnit: z
      .enum(["minutes", "hours", "days", "weeks"])
      .optional(),
    expireInactivityAmount: z.number().optional(),
    expireInactivityUnit: z
      .enum(["minutes", "hours", "days", "weeks"])
      .optional(),
    activateAtEnabled: z.boolean().optional(),
    activateAt: z.string().optional(),
    // UTM Builder
    utmEnabled: z.boolean().optional(),
    utmSource: z.string().optional(),
    utmMedium: z.string().optional(),
    utmCampaign: z.string().optional(),
    utmTerm: z.string().optional(),
    utmContent: z.string().optional(),
    // A/B testing
    abEnabled: z.boolean().optional(),
    abVariants: z
      .array(
        z.object({
          url: z.string().optional(),
          weight: z.number().min(0).max(100).optional(),
        }),
      )
      .optional(),
    // Targeting
    targetingEnabled: z.boolean().optional(),
    targetingCountryMode: z.enum(["include", "exclude"]).optional(),
    targetingCountries: z.array(z.string()).optional(),
    targetingDevices: z.array(z.string()).optional(),
    targetingOs: z.array(z.string()).optional(),
    // Password protection
    passwordEnabled: z.boolean().optional(),
    password: z.string().optional(),
    passwordHint: z.string().optional(),
    // QR Code (UI-only)
    qrEnabled: z.boolean().optional(),
    qrSize: z.number().optional(),
    qrMargin: z.number().optional(),
    qrFg: z.string().optional(),
    qrBg: z.string().optional(),
    qrTransparentBg: z.boolean().optional(),
    qrIncludeMargin: z.boolean().optional(),
    qrEcc: z.enum(["L", "M", "Q", "H"]).optional(),
    qrLogoMode: z.enum(["brand", "custom", "none"]).optional(),
    qrLogoScale: z.number().optional(),
    qrCustomLogoUrl: z.string().optional(),
    // Fallback / Health
    fallbackEnabled: z.boolean().optional(),
    healthCheckUrl: z.string().optional(),
    fallbackUrl: z.string().optional(),
    retryCount: z.number().optional(),
    retryIntervalMs: z.number().optional(),
    // Social Metadata
    socialEnabled: z.boolean().optional(),
    socialTitle: z.string().optional(),
    socialDescription: z.string().optional(),
    socialImageUrl: z.string().optional(),
    // Tags / Notes
    collectionId: z.string().optional(),
    newCollectionName: z.string().optional(),
    newCollectionColor: z.string().optional(),
    tagsEnabled: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    trackingEnabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.expiresEnabled || !data.expireMode || data.expireMode === "none")
      return;
    if (data.expireMode === "datetime") {
      const val = data.expiresAt ?? "";
      if (val.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiresAt"],
          message: "Expiration is required when enabled.",
        });
        return;
      }
      const ts = Date.parse(val);
      if (Number.isNaN(ts)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiresAt"],
          message: "Choose a valid date and time.",
        });
        return;
      }
      if (ts <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expiresAt"],
          message: "Expiration must be in the future.",
        });
      }
    }
    if (data.expireMode === "totalClicks") {
      const clicks = Number(data.expireTotalClicks ?? 0);
      if (!Number.isFinite(clicks) || clicks <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expireTotalClicks"],
          message: "Total clicks must be greater than 0.",
        });
      }
    }
    if (data.expireMode === "duration") {
      const amount = Number(data.expireDurationAmount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expireDurationAmount"],
          message: "Duration must be greater than 0.",
        });
      }
      if (!data.expireDurationUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expireDurationUnit"],
          message: "Select a duration unit.",
        });
      }
    }
    if (data.expireMode === "inactivity") {
      const amount = Number(data.expireInactivityAmount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expireInactivityAmount"],
          message: "Inactivity duration must be greater than 0.",
        });
      }
      if (!data.expireInactivityUnit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["expireInactivityUnit"],
          message: "Select an inactivity unit.",
        });
      }
    }
  });

export type UrlFormValues = z.infer<typeof urlFormSchema>;

export function UrlShortener() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] =
    useState<string>(getShortDomain());

  // Get active custom domains for domain selector
  const activeDomains = useQuery(api.customDomains.getActiveDomains);

  const form = useForm<UrlFormValues>({
    resolver: zodResolver(urlFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      url: "",
      slugMode: "random",
      expiresEnabled: false,
      expiresAt: "",
      expireMode: "none",
      expireTotalClicks: 0,
      expireDurationAmount: 0,
      expireDurationUnit: "days",
      expireInactivityAmount: 0,
      expireInactivityUnit: "days",
      activateAtEnabled: false,
      activateAt: "",
      utmEnabled: false,
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      utmTerm: "",
      utmContent: "",
      abEnabled: false,
      abVariants: [
        { url: "", weight: 50 },
        { url: "", weight: 50 },
      ],
      targetingEnabled: false,
      targetingCountryMode: "include",
      targetingCountries: [],
      targetingDevices: [],
      targetingOs: [],
      passwordEnabled: false,
      password: "",
      passwordHint: "",
      qrEnabled: false,
      qrSize: 200,
      qrMargin: 2,
      qrFg: "#000000",
      qrBg: "#ffffff",
      qrTransparentBg: false,
      qrIncludeMargin: true,
      qrEcc: "H",
      qrLogoMode: "brand",
      qrLogoScale: 0.18,
      qrCustomLogoUrl: "",
      fallbackEnabled: false,
      healthCheckUrl: "",
      fallbackUrl: "",
      retryCount: 1,
      retryIntervalMs: 1000,
      socialEnabled: false,
      socialTitle: "",
      socialDescription: "",
      socialImageUrl: "",
      collectionId: "",
      newCollectionName: "",
      newCollectionColor: "",
      tagsEnabled: false,
      tags: [],
      notes: "",
      trackingEnabled: true,
    },
  });

  const { isSubmitting } = form.formState;

  const { add } = useToast();

  const createUrl = useMutation(api.urlMainFuction.createUrl);
  const createCollection = useMutation(
    api.collectionMangament.createCollection,
  );

  const { faviconUrl } = useFavicon(currentUrl);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const summaryChips = useMemo(() => {
    const chips: string[] = [];
    const values = form.getValues();

    if (values.utmEnabled) chips.push("UTM");
    if (values.abEnabled) chips.push("A/B Test");
    if (values.activateAtEnabled) chips.push("Schedule");
    if (values.targetingEnabled) chips.push("Geo & Device");
    if (values.passwordEnabled) chips.push("Password");
    if (values.qrEnabled) chips.push("QR Code");
    if (values.fallbackEnabled) chips.push("Fallback");
    if (values.socialEnabled) chips.push("Social");
    if (
      values.tagsEnabled ||
      (values.tags && values.tags.length > 0) ||
      values.collectionId ||
      values.notes
    )
      chips.push("Tags & Notes");

    return chips;
  }, [form]);

  const handleUrlBlur = async (urlValue: string) => {
    const trimmedValue = urlValue.trim();
    if (trimmedValue) {
      const isValid = await form.trigger("url");
      if (isValid) {
        // Ensure URL has protocol for favicon fetching
        const urlWithProtocol = /^https?:\/\//i.test(trimmedValue)
          ? trimmedValue
          : `https://${trimmedValue}`;
        setCurrentUrl(urlWithProtocol);
      } else {
        setCurrentUrl(null);
      }
    } else {
      // Clear errors for empty field - required check happens on submit
      form.clearErrors("url");
      setCurrentUrl(null);
    }
  };

  const handleUrlChange = () => {
    setCurrentUrl(null);
    // Clear URL error when user starts typing again
    if (form.formState.errors.url) {
      form.clearErrors("url");
    }
  };

  const onSubmit = async (values: UrlFormValues) => {
    try {
      let urlToShorten = values.url.trim();
      if (!/^https?:\/\//i.test(urlToShorten)) {
        urlToShorten = `https://${urlToShorten}`;
      }

      let collectionIdToUse =
        values.collectionId && values.collectionId.trim().length > 0
          ? values.collectionId
          : undefined;

      if (values.newCollectionName?.trim()) {
        const newId = await createCollection({
          name: values.newCollectionName.trim(),
          description: "",
          collectionColor:
            values.newCollectionColor?.trim() || getRandomCollectionColor(),
        });
        collectionIdToUse = newId;
      }

      const expiresAtValue =
        values.expiresEnabled && values.expiresAt
          ? new Date(values.expiresAt).getTime()
          : undefined;

      const result = await createUrl({
        url: urlToShorten,
        slugType: values.slugMode,
        trackingEnabled: values.trackingEnabled,
        expiresAt: expiresAtValue,
        collectionId: collectionIdToUse as Id<"collections"> | undefined,
        customDomain:
          selectedDomain !== getShortDomain() ? selectedDomain : undefined,
        qrEnabled: values.qrEnabled ?? false,
        qrStyle: values.qrEnabled
          ? {
              fg: (values.qrFg ?? "#000000").trim(),
              bg: values.qrTransparentBg
                ? "transparent"
                : (values.qrBg ?? "#ffffff").trim(),
              margin: Number(values.qrMargin ?? 2),
              logoMode: (values.qrLogoMode ?? "brand") as
                | "brand"
                | "custom"
                | "none",
              logoScale: Number(values.qrLogoScale ?? 0.18),
              customLogoUrl:
                values.qrLogoMode === "custom" && values.qrCustomLogoUrl
                  ? String(values.qrCustomLogoUrl).trim()
                  : undefined,
            }
          : undefined,
        // UTM Parameters - only pass if UTM is enabled
        ...(values.utmEnabled && {
          utmSource: values.utmSource?.trim() || undefined,
          utmMedium: values.utmMedium?.trim() || undefined,
          utmCampaign: values.utmCampaign?.trim() || undefined,
          utmTerm: values.utmTerm?.trim() || undefined,
          utmContent: values.utmContent?.trim() || undefined,
        }),
        // A/B Testing - only pass if A/B is enabled and has valid variants
        ...(values.abEnabled &&
          values.abVariants?.some((v) => v.url?.trim()) && {
            abEnabled: true,
            abVariants: values.abVariants
              .filter((v) => v.url?.trim())
              .map((v) => ({
                url: v.url!.trim(),
                weight: v.weight ?? 50,
              })),
          }),
      });

      // Use the selected domain for the final short link
      const finalShort = `${selectedDomain}/${result.slug}`;

      // Track URL creation with feature flags for analytics
      trackUrlCreated({
        slug_type: values.slugMode,
        has_expiration: values.expiresEnabled,
        has_utm: values.utmEnabled ?? false,
        has_ab_test: values.abEnabled ?? false,
        has_password: values.passwordEnabled ?? false,
        has_qr_code: values.qrEnabled ?? false,
        has_fallback: values.fallbackEnabled ?? false,
        has_collection: !!collectionIdToUse,
        has_targeting: values.targetingEnabled ?? false,
        has_social_metadata: values.socialEnabled ?? false,
      });

      add({
        type: "success",
        title: "Short link ready",
        description: `Copy and share: ${finalShort}`,
      });

      // Reset form to defaults, keeping only the generated short URL for optional previews
      form.reset({
        url: "",
        slugMode: "random",
        expiresEnabled: false,
        expiresAt: "",
        expireMode: "none",
        expireTotalClicks: 0,
        expireDurationAmount: 0,
        expireDurationUnit: "days",
        expireInactivityAmount: 0,
        expireInactivityUnit: "days",
        activateAtEnabled: false,
        activateAt: "",
        utmEnabled: false,
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        utmTerm: "",
        utmContent: "",
        abEnabled: false,
        abVariants: [
          { url: "", weight: 50 },
          { url: "", weight: 50 },
        ],
        targetingEnabled: false,
        targetingCountryMode: "include",
        targetingCountries: [],
        targetingDevices: [],
        targetingOs: [],
        passwordEnabled: false,
        password: "",
        passwordHint: "",
        qrEnabled: false,
        qrSize: 200,
        qrMargin: 2,
        qrFg: "#000000",
        qrBg: "#ffffff",
        qrTransparentBg: false,
        qrIncludeMargin: true,
        qrEcc: "H",
        qrLogoMode: "brand",
        qrLogoScale: 0.18,
        qrCustomLogoUrl: "",
        fallbackEnabled: false,
        healthCheckUrl: "",
        fallbackUrl: "",
        retryCount: 1,
        retryIntervalMs: 1000,
        socialEnabled: false,
        socialTitle: "",
        socialDescription: "",
        socialImageUrl: "",
        collectionId: "",
        newCollectionName: "",
        newCollectionColor: "",
        tagsEnabled: false,
        tags: [],
        notes: "",
        trackingEnabled: true,
        shortUrl: finalShort,
      });
      setCurrentUrl(null);
      setAdvancedOpen(false);
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? typeof error.data === "string"
            ? error.data
            : (error.data as { message: string }).message
          : "An unexpected error occurred while creating the link";
      console.log("error", error);
      console.log("message", message);
      add({
        type: "error",
        title: "We couldn't shorten that",
        description: message,
      });
    }
  };

  const onInvalid = (errors: FieldErrors<UrlFormValues>) => {
    if (form.getValues("expiresEnabled") && errors.expiresAt?.message) {
      add({
        type: "error",
        title: "Invalid expiration",
        description: String(errors.expiresAt.message),
      });
      return;
    }
    if (errors.url?.message) {
      add({
        type: "error",
        title: "Invalid URL",
        description: String(errors.url.message),
      });
      return;
    }
    add({
      type: "error",
      title: "Please fix the form",
      description: "Some fields have errors. Review and try again.",
    });
  };

  return (
    <Card>
      <CardHeader className="flex w-full flex-col items-start justify-between gap-1">
        <CardTitle className="text-lg font-medium">Shorten a Link</CardTitle>
        <CardDescription className="text-muted-foreground">
          Paste a long URL to create a short, trackable link
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="url"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Enter your long link</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <InputGroup className="border-border rounded-md border bg-white">
                        <InputGroupAddon
                          className={cn(
                            "bg-transparent pl-3 transition-transform duration-200 ease-out",
                            {
                              "-z-10 -translate-x-5 scale-0 opacity-0":
                                !faviconUrl,
                              "z-0 -translate-x-1 scale-100 opacity-100":
                                faviconUrl,
                            },
                          )}
                        >
                          {faviconUrl && (
                            <Image
                              src={faviconUrl}
                              alt={field.value}
                              width={20}
                              height={20}
                              className="size-5 rounded-full"
                              unoptimized
                            />
                          )}
                        </InputGroupAddon>
                        <InputGroupInput
                          id="destination-url-input"
                          placeholder="https://example.com/very/long/url/path"
                          className="border-border rounded-md rounded-l-none border-y border-l-0 pl-0"
                          aria-invalid={fieldState.invalid}
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleUrlChange();
                          }}
                          onBlur={(e) => {
                            field.onBlur();
                            handleUrlBlur(e.target.value);
                          }}
                        />
                      </InputGroup>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slugMode"
              render={({ field }) => (
                <FormItem>
                  <div className="border-border bg-muted/20 rounded-lg border p-4">
                    {/* Domain Selector */}
                    {activeDomains && activeDomains.length > 0 && (
                      <div className="mb-4">
                        <div className="text-muted-foreground mb-2 text-xs">
                          Domain
                        </div>
                        <Select
                          value={selectedDomain}
                          onValueChange={setSelectedDomain}
                        >
                          <SelectTrigger className="border-border h-8 w-fit border bg-white text-xs shadow-xs">
                            <SelectValue placeholder="Select domain" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={getShortDomain()}>
                              {getShortDomain()}
                            </SelectItem>
                            {activeDomains.map((domain) => (
                              <SelectItem
                                key={domain._id}
                                value={domain.domain}
                              >
                                {domain.domain}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="text-muted-foreground mb-3 text-xs">
                      Link Style
                    </div>
                    <FormControl>
                      <RadioGroup
                        className="grid gap-3"
                        value={field.value}
                        onValueChange={field.onChange}
                        name={field.name}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            id="slug-random"
                            value="random"
                            size="sm"
                          />
                          <label htmlFor="slug-random" className="text-sm">
                            Random characters{" "}
                            <span className="text-muted-foreground text-xs">
                              (e.g. {selectedDomain}/
                              <span className="text-primary px-1">a1b2c3</span>)
                            </span>
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <RadioGroupItem
                            id="slug-human"
                            value="human"
                            size="sm"
                          />
                          <label htmlFor="slug-human" className="text-sm">
                            Readable words{" "}
                            <span className="text-muted-foreground text-xs">
                              (e.g. {selectedDomain}/
                              <span className="text-primary px-1">
                                bunnyhops
                              </span>
                              )
                            </span>
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            {/* Advanced Options */}
            <div className="space-y-3">
              <HotkeyButton
                kbdClassName="no-underline text-xs h-fit py-0.5 shadow-xs from-gray-200 to-gray-100 backdrop-blur-sm text-black/60 rounded-xs border"
                type="button"
                hotkey="a"
                enableOnFormTags={false}
                onClick={() => {
                  if (!advancedOpen) {
                    trackAdvancedOptionsOpened();
                  }
                  setAdvancedOpen(!advancedOpen);
                }}
                className="group hover:bg-muted/70 bg-transparent px-1.5 py-0 text-xs text-black outline-1 hover:font-medium hover:shadow-none"
              >
                <span
                  className={cn(
                    "text-xs underline decoration-blue-600 decoration-dashed underline-offset-4",
                    {
                      "text-muted-foreground font-normal": advancedOpen,
                      "": !advancedOpen,
                    },
                  )}
                >
                  {advancedOpen
                    ? "[Hide Advance Options]"
                    : "[Show Advance Options]"}
                </span>
              </HotkeyButton>

              <AdvancedOptions
                form={form}
                open={advancedOpen}
                onOpenChange={setAdvancedOpen}
              />
            </div>
          </CardContent>
          <CardFooter className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky -bottom-8 z-10 flex-wrap justify-between gap-3 rounded-b-md border-t py-5 backdrop-blur">
            <div className="flex items-center gap-2">
              <HotkeyButton
                hotkey={isSubmitting ? "" : "meta + enter"}
                type="submit"
                onClick={() => form.handleSubmit(onSubmit, onInvalid)()}
                disabled={!form.watch("url") || isSubmitting}
                className="bg-accent hover:bg-accent/90 w-36 rounded-sm text-sm font-medium text-black drop-shadow-none transition-shadow duration-75 ease-out hover:drop-shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex w-full items-center gap-3">
                    <CircleGridLoaderIcon className="size-3 text-black" />
                    <ShimmeringPhrases />
                  </span>
                ) : (
                  "Shorten"
                )}
              </HotkeyButton>
            </div>
            {summaryChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {summaryChips.map((label) => (
                  <Badge key={label} variant="default" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

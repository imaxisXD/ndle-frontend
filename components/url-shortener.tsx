"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ConvexError } from "convex/values";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import validator from "validator";
import { useQuery } from "@tanstack/react-query";
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
import { makeShortLink } from "@/lib/config";
import { CalendarPreset } from "./ui/calendar-presets";
import { format } from "date-fns";

const urlFormSchema = z
  .object({
    url: z
      .string()
      .refine(
        (val) => {
          if (!val || val.trim() === "") return true;

          const isValid = validator.isURL(val, {
            protocols: ["http", "https"],
            require_protocol: true,
            require_valid_protocol: true,
          });
          return isValid;
        },
        {
          message: "Please enter a valid link",
        },
      )
      .refine(
        (val) => {
          return val && val.trim() !== "";
        },
        {
          message: "Link is required",
        },
      ),
    shortUrl: z.string().optional(),
    slugMode: z.enum(["random", "human"]),
    expiresEnabled: z.boolean(),
    expiresAt: z.string().optional(),
    trackingEnabled: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.expiresEnabled) return;
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
  });

type UrlFormValues = z.infer<typeof urlFormSchema>;

export function UrlShortener() {
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);

  const form = useForm<UrlFormValues>({
    resolver: zodResolver(urlFormSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      url: "",
      slugMode: "random",
      expiresEnabled: false,
      expiresAt: "",
      trackingEnabled: true,
    },
  });

  const { isSubmitting } = form.formState;

  const { add } = useToast();

  const createUrl = useMutation(api.urlMainFuction.createUrl);

  const { data: faviconData } = useQuery({
    queryKey: ["favicon", currentUrl],
    queryFn: async () => {
      if (!currentUrl) return null;

      try {
        const response = await fetch(
          `/api/getFavicon?url=${encodeURIComponent(currentUrl)}`,
        );

        if (!response.ok) {
          console.log(`Favicon not found for: ${currentUrl}`);
          return null;
        }

        const data = await response.json();
        return data.faviconUrl;
      } catch (error) {
        console.log(`Error fetching favicon for: ${currentUrl}`, error);
        return null;
      }
    },
    enabled: !!currentUrl,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const faviconUrl = faviconData ?? null;

  const handleUrlBlur = async (urlValue: string) => {
    if (urlValue.trim()) {
      const isValid = await form.trigger("url");
      if (isValid) {
        setCurrentUrl(urlValue);
      } else {
        setCurrentUrl(null);
      }
    } else {
      setCurrentUrl(null);
    }
  };

  const handleUrlChange = () => {
    setCurrentUrl(null);
  };

  const onSubmit = async (values: UrlFormValues) => {
    try {
      const expiresAtValue =
        values.expiresEnabled && values.expiresAt
          ? new Date(values.expiresAt).getTime()
          : undefined;

      const result = await createUrl({
        url: values.url,
        slugType: values.slugMode,
        trackingEnabled: values.trackingEnabled,
        expiresAt: expiresAtValue,
      });

      const finalShort = makeShortLink(result.slug);
      add({
        type: "success",
        title: "Short link ready",
        description: `Copy and share: ${finalShort}`,
      });

      form.reset();
      setCurrentUrl(null);
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
        <CardDescription>
          Create a short link with a human-readable slug, expiration, and more.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter your long link</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <InputGroup className="border-border rounded-md border bg-white">
                        <InputGroupAddon
                          className={cn(
                            "bg-transparent pl-3 transition-transform duration-300 ease-in",
                            {
                              "-z-10 -translate-x-5": !faviconUrl,
                              "z-0 -translate-x-1": faviconUrl,
                            },
                          )}
                        >
                          {faviconUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={faviconUrl}
                              alt={field.value}
                              className="size-5 rounded-md"
                            />
                          )}
                        </InputGroupAddon>
                        <InputGroupInput
                          placeholder="https://example.com/very/long/url/path"
                          className="border-border rounded-md rounded-l-none border-y border-l-0 pl-0"
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
                    <div className="text-muted-foreground mb-3 text-xs">
                      Slug
                    </div>
                    <FormControl>
                      <RadioGroup
                        className="grid gap-3"
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem
                            id="slug-random"
                            value="random"
                            size="sm"
                          />
                          <label htmlFor="slug-random" className="text-sm">
                            Random slug{" "}
                            <span className="text-muted-foreground text-xs">
                              (e.g., {makeShortLink("a1b2c3")})
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
                            Human-readable slug{" "}
                            <span className="text-muted-foreground text-xs">
                              (e.g., {makeShortLink("raregeckosjam")})
                            </span>
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            <div className="border-border bg-muted/20 space-y-3 rounded-lg border p-4">
              <div className="text-muted-foreground text-xs">Options</div>

              <FormField
                control={form.control}
                name="expiresEnabled"
                render={({ field }) => (
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="opt-expiration"
                    />
                    <label htmlFor="opt-expiration">Set expiration</label>
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex pl-3">
                      <CalendarPreset
                        disabled={!form.watch("expiresEnabled")}
                        isPro={true}
                        value={field.value ? new Date(field.value) : undefined}
                        onSelectDate={(d) => {
                          if (!d) {
                            field.onChange("");
                            return;
                          }
                          const v = format(d, "yyyy-MM-dd'T'HH:mm");
                          field.onChange(v);
                        }}
                        onUpgradeClick={() =>
                          add({
                            type: "default",
                            title: "Upgrade required",
                            description: "Custom date requires PRO",
                          })
                        }
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trackingEnabled"
                render={({ field }) => (
                  <div className="mt-6 flex items-center gap-2 text-sm">
                    <Checkbox
                      size="sm"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      id="opt-tracking"
                    />
                    <label htmlFor="opt-tracking">Enable click tracking</label>
                  </div>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3 py-5">
            <div className="flex items-center gap-2">
              <Button
                type="submit"
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
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

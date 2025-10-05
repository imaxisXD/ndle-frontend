"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleGridLoaderIcon, CopyIcon, ExternalLinkIcon } from "./icons";
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
import { useNavigate } from "react-router";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ConvexError } from "convex/values";

export function UrlShortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [slugMode, setSlugMode] = useState<"random" | "human">("random");
  const [expiresEnabled, setExpiresEnabled] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { add } = useToast();
  const navigate = useNavigate();
  const createUrl = useMutation(api.urlShortner.createUrl);

  const urlInputId = useId();

  const BASE_DOMAIN = useMemo(() => {
    if (typeof window === "undefined") {
      return "https://ndle.im";
    }
    return window.location.origin;
  }, []);

  const handleShorten = async () => {
    if (!url) {
      add({
        type: "info",
        title: "Missing link",
        description: "Add the URL you want to shorten before continuing.",
      });
      return;
    }

    setIsSubmitting(true);
    setShortUrl("");

    try {
      const expiresAtValue =
        expiresEnabled && expiresAt ? new Date(expiresAt).getTime() : undefined;

      if (expiresEnabled && expiresAt && Number.isNaN(expiresAtValue)) {
        add({
          type: "error",
          title: "Invalid expiration",
          description:
            "Choose a valid future date and time for when the short link should stop working.",
        });
        setIsSubmitting(false);
        return;
      }

      const result = await createUrl({
        url,
        slugType: slugMode,
        trackingEnabled,
        expiresAt: expiresAtValue,
      });

      const finalShort = `${BASE_DOMAIN}/${result.slug}`;
      setShortUrl(finalShort);
      add({
        type: "success",
        title: "Short link ready",
        description: `Copy and share: ${finalShort}`,
      });
      // navigate(`/link/${result.slug}`);
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
        title: "We couldn’t shorten that",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div>
            <CardTitle className="font-mono">Shorten a URL</CardTitle>
            <CardDescription className="font-mono">
              Create a short link with a human-readable slug, expiration, and
              more.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label
            htmlFor={urlInputId}
            className="mb-2 block font-mono text-sm text-foreground"
          >
            Enter your long URL
          </label>
          <div className="flex gap-2">
            <Input
              id={urlInputId}
              type="url"
              placeholder="https://example.com/very/long/url/path"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 bg-muted/20">
          <div className="mb-3 font-mono text-xs text-muted-foreground">
            Slug
          </div>
          <div className="flex flex-col gap-3">
            <RadioGroup
              className="grid gap-3"
              value={slugMode}
              onValueChange={(val) => {
                const v = val as "random" | "human";
                setSlugMode(v);
              }}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="slug-random" value="random" size="sm" />
                <label htmlFor="slug-random" className="text-sm ">
                  Random slug{" "}
                  <span className="text-muted-foreground text-xs">
                    (e.g., {BASE_DOMAIN}/a1b2c3)
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <RadioGroupItem id="slug-human" value="human" size="sm" />
                <label htmlFor="slug-human" className="text-sm">
                  Human-readable slug{" "}
                  <span className="text-muted-foreground text-xs">
                    (e.g., {BASE_DOMAIN}/raregeckosjam)
                  </span>
                </label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-3">
          <div className="font-mono text-xs text-muted-foreground">Options</div>
          <div className="flex items-center gap-2 font-mono text-sm">
            <Checkbox
              checked={expiresEnabled}
              onCheckedChange={(v) => setExpiresEnabled(Boolean(v))}
              id="opt-expiration"
            />
            <label htmlFor="opt-expiration">Set expiration</label>
          </div>
          <div className="flex gap-2 pl-6">
            <Input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              disabled={!expiresEnabled}
              className="font-mono text-sm max-w-xs"
            />
          </div>

          <div className="flex items-center gap-2 font-mono text-sm">
            <Checkbox
              size="sm"
              checked={trackingEnabled}
              onCheckedChange={(v) => setTrackingEnabled(Boolean(v))}
              id="opt-tracking"
            />
            <label htmlFor="opt-tracking">Enable click tracking</label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-between gap-3 flex-wrap py-5">
        <div className="flex items-center gap-2">
          <Button
            disabled={!url || isSubmitting}
            onClick={handleShorten}
            className="bg-accent w-36 rounded-sm text-black font-mono font-medium text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed hover:drop-shadow-sm ease-linear drop-shadow-none transition-shadow duration-75"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <CircleGridLoaderIcon className="size-3 " />
                Shortening
              </span>
            ) : (
              "Shorten"
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/lib/toast-context";
import { CopyIcon, ExternalLinkIcon } from "./icons";
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

export function UrlShortener() {
  const [url, setUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [slugMode, setSlugMode] = useState<"random" | "human">("random");
  const [humanSlug, setHumanSlug] = useState("");
  const [expiresEnabled, setExpiresEnabled] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const urlInputId = useId();

  const BASE_DOMAIN = "https://short.link";

  const generateRandomSlug = () => Math.random().toString(36).substring(2, 8);
  const generateHumanSlug = () => {
    const adjectives = [
      "rare",
      "calm",
      "brisk",
      "bright",
      "swift",
      "merry",
      "quiet",
      "clever",
      "bold",
      "lively",
    ];
    const animals = [
      "geckos",
      "otters",
      "owls",
      "pandas",
      "tigers",
      "rabbits",
      "whales",
      "wolves",
      "eagles",
      "foxes",
    ];
    const verbs = [
      "jam",
      "dance",
      "hike",
      "spin",
      "glide",
      "sing",
      "dash",
      "zoom",
      "swim",
      "soar",
    ];
    const pick = (arr: Array<string>) =>
      arr[Math.floor(Math.random() * arr.length)];
    return `${pick(adjectives)}-${pick(animals)}-${pick(verbs)}`;
  };

  const handleShorten = () => {
    if (!url) {
      showToast("Please enter a URL to shorten", "error");
      return;
    }

    let slug = "";
    if (slugMode === "human") {
      const value = humanSlug || generateHumanSlug();
      setHumanSlug(value);
      slug = value;
    } else {
      slug = generateRandomSlug();
    }

    const finalShort = `${BASE_DOMAIN}/${slug}`;
    setShortUrl(finalShort);
    showToast("Link created (demo)", "success");
    navigate(`/link/${slug}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shortUrl);
    showToast("Link copied to clipboard!", "success");
  };

  // const previewShortUrl =
  //   slugMode === "human"
  //     ? `${BASE_DOMAIN}/${humanSlug || "rare-geckos-jam"}`
  //     : `${BASE_DOMAIN}/random`;

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
        {/* Long URL */}
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

        {/* Slug options */}
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
                if (v === "human" && !humanSlug) {
                  setHumanSlug(generateHumanSlug());
                }
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

        {/* Other options */}
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
      <CardFooter className="justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button
            disabled={!url}
            onClick={handleShorten}
            className="bg-accent text-black font-mono font-medium text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed hover:drop-shadow-md ease-in-out drop-shadow-none transition-shadow duration-150"
          >
            Shorten
          </Button>
        </div>

        {shortUrl && (
          <div className="ml-auto rounded-xl border border-border bg-accent p-3">
            <div className="mb-1 font-mono text-xs text-muted-foreground">
              Your shortened URL
            </div>
            <div className="flex items-center justify-between gap-3">
              <code className="font-mono text-sm font-medium text-foreground">
                {shortUrl}
              </code>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <CopyIcon className="h-4 w-4" />
                </button>
                <a
                  href={shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

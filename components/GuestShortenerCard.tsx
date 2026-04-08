"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getShortDomain } from "@/lib/config";
import { getOrCreateGuestId } from "@/lib/guest";
import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr";
import { QRCodeSVG } from "qrcode.react";

export function GuestShortenerCard() {
  const { add } = useToast();
  const createGuestUrl = useMutation(api.urlMainFuction.createGuestUrl);

  const [guestId, setGuestId] = useState("");
  const [destination, setDestination] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shortLink, setShortLink] = useState("");

  useEffect(() => {
    setGuestId(getOrCreateGuestId());
  }, []);

  const normalizedDestination = useMemo(() => {
    const trimmed = destination.trim();
    if (!trimmed) {
      return "";
    }
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }, [destination]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!normalizedDestination || !guestId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createGuestUrl({
        url: normalizedDestination,
        guestId,
        guestEmail: email.trim() || undefined,
      });
      const nextShortLink = `https://${getShortDomain()}/${result.slug}`;
      setShortLink(nextShortLink);
      add({
        type: "success",
        title: "Short link ready",
        description: "Sign in later and we will move this link into your account.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "We could not shorten that link.";
      add({
        type: "error",
        title: "Create failed",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/70 bg-white/95 shadow-xl shadow-black/5">
      <CardHeader>
        <CardTitle className="text-2xl">Create a short link now</CardTitle>
        <CardDescription>
          No login needed. Guest links stay active for 7 days. Sign in later to
          keep them, see stats, and add your own domain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="guest-url-input">
              Long link
            </label>
            <Input
              id="guest-url-input"
              placeholder="https://example.com/your-page"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="guest-email-input">
              Email (optional)
            </label>
            <Input
              id="guest-email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Add your email if you want us to match these guest links after you
              sign in.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!normalizedDestination || !guestId || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Shorten link"}
          </Button>
        </form>

        {shortLink ? (
          <div className="space-y-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Your guest link
              </p>
              <div className="break-all text-sm font-medium">{shortLink}</div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border bg-white p-2">
                  <QRCodeSVG value={shortLink} size={72} />
                </div>
                <div className="text-muted-foreground text-xs">
                  <div className="flex items-center gap-1 font-medium text-zinc-700">
                    <QrCodeIcon className="size-4" />
                    Basic QR ready
                  </div>
                  <p>Sign in later to keep this link and unlock saved stats.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(shortLink)}
                >
                  Copy
                </Button>
                <Button asChild>
                  <Link href="/sign-in">Sign in to keep it</Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


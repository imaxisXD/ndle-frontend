"use client";

import { useMemo } from "react";
import { QrCode } from "@/components/ui/qr-code";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { UseFormReturn, useWatch } from "react-hook-form";
import type { UrlFormValues } from "../url-shortener";
import { ColorSelector } from "@/components/collection/ColorSelector";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Palette, Download, CloudDownload } from "iconoir-react";
import { COLLECTION_COLORS } from "@/components/collection/colors";
import { getQrLogo, getQrMarginSize, normalizeQrStyle } from "@/lib/qr";
import { qrCodeSvg } from "@/lib/qr-code";
import { downloadQrPng, downloadQrSvg } from "@/lib/qr-file";
import { makeShortLink } from "@/lib/config";
import { Inset } from "@/components/ui/inset";

// Generated slugs never contain "-", so this placeholder can never open a real link.
const PLACEHOLDER_QR_VALUE = `https://${makeShortLink("your-link")}`;

type Props = {
  form: UseFormReturn<UrlFormValues>;
  isPro?: boolean;
};

export function OptionQRCode({ form, isPro = false }: Props) {
  const [
    size,
    margin,
    fg,
    bg,
    transparentBg,
    includeMargin,
    ecc,
    logoMode,
    logoScale,
    customLogoUrl,
  ] = useWatch({
    control: form.control,
    // watching all relevant fields ensures this component re-renders on change
    name: [
      "qrSize",
      "qrMargin",
      "qrFg",
      "qrBg",
      "qrTransparentBg",
      "qrIncludeMargin",
      "qrEcc",
      "qrLogoMode",
      "qrLogoScale",
      "qrCustomLogoUrl",
    ] as const,
  }) as [
    number,
    number,
    string,
    string,
    boolean,
    boolean,
    "L" | "M" | "Q" | "H",
    "brand" | "custom" | "none",
    number,
    string,
  ];
  const shortUrl: string | undefined = useWatch({
    control: form.control,
    name: "shortUrl",
  });
  // Only the created short link may be encoded: a code pointing at the destination
  // would bypass ndle, so it could never be tracked or redirected elsewhere.
  const createdShortLink = shortUrl
    ? /^https?:\/\//i.test(shortUrl)
      ? shortUrl
      : `https://${shortUrl}`
    : undefined;
  const qrValue = createdShortLink ?? PLACEHOLDER_QR_VALUE;

  const qrStyle = useMemo(
    () =>
      normalizeQrStyle({
        size,
        margin,
        fg,
        bg: transparentBg ? "transparent" : bg,
        includeMargin,
        ecc,
        logoMode,
        logoScale,
        customLogoUrl,
      }),
    [
      size,
      margin,
      fg,
      bg,
      transparentBg,
      includeMargin,
      ecc,
      logoMode,
      logoScale,
      customLogoUrl,
    ],
  );

  const logo = useMemo(() => getQrLogo(qrStyle), [qrStyle]);

  // Downloads are drawn fresh from the same renderer as the preview.
  const fileSvg = () =>
    qrCodeSvg(qrValue, {
      size: qrStyle.size,
      fg: qrStyle.fg,
      bg: qrStyle.bg,
      ecc: qrStyle.ecc,
      margin: getQrMarginSize(qrStyle),
      logo,
    });

  const downloadSvg = () => {
    if (!createdShortLink) return;
    downloadQrSvg(fileSvg(), "qr.svg");
  };

  const downloadPng = async () => {
    if (!createdShortLink) return;
    await downloadQrPng(fileSvg(), qrStyle.size, "qr.png");
  };

  return (
    <Inset className="rounded-lg p-4 md:p-6">
      {/* Layout: controls on left, preview on right */}
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1 space-y-8">
          {/* Appearance Section */}
          <div className="space-y-4">
            <h4 className="text-foreground flex items-center gap-2 text-sm font-medium">
              <Palette className="text-muted-foreground size-4" />
              Appearance
            </h4>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="qrFg"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-xs">Code Color</FormLabel>
                    <FormControl>
                      <ColorSelector
                        value={field.value ?? "#000000"}
                        onChange={(val) => {
                          const newFg = val;
                          const currentBg = form.getValues("qrBg");

                          // Auto-contrast: If FG matches BG, flip BG to white/black
                          if (newFg === currentBg) {
                            const newBg =
                              newFg === "#ffffff" ? "#000000" : "#ffffff";
                            form.setValue("qrBg", newBg);
                          }

                          field.onChange(newFg);
                        }}
                        colors={COLLECTION_COLORS}
                        className="gap-2"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qrBg"
                render={() => (
                  <FormItem className="space-y-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs">Background</FormLabel>
                    </div>
                    <FormControl>
                      {/* Custom Transparent Option Logic */}
                      <div className="flex flex-wrap gap-3">
                        {/* Regular Colors with Transparent prepended */}
                        <ColorSelector
                          value={
                            transparentBg ? "transparent" : (bg ?? "#ffffff")
                          }
                          onChange={(val) => {
                            if (val === "transparent") {
                              form.setValue("qrTransparentBg", true);
                            } else {
                              const newBg = val || "#ffffff";
                              const currentFg = form.getValues("qrFg");

                              // Auto-contrast: If BG matches FG, flip FG to black/white
                              if (newBg === currentFg) {
                                const newFg =
                                  newBg === "#000000" ? "#ffffff" : "#000000";
                                form.setValue("qrFg", newFg);
                              }

                              form.setValue("qrTransparentBg", false);
                              form.setValue("qrBg", newBg);
                            }
                          }}
                          colors={COLLECTION_COLORS}
                          className="gap-3"
                          showTransparentOption={true}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="bg-border/50 h-px" />

          {/* Branding Section */}
          <div className="space-y-4">
            <h4 className="text-foreground text-sm font-medium">
              Logo Overlay
            </h4>
            <FormField
              control={form.control}
              name="qrLogoMode"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value ?? "brand"}
                      onValueChange={(v) => field.onChange(v)}
                      className="flex flex-wrap gap-2"
                    >
                      <label
                        htmlFor="qr-logo-brand"
                        className={cn(
                          "border-border hover:bg-surface-hover inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                          field.value === "brand" &&
                            "bg-accent text-accent-foreground border-primary/20",
                        )}
                      >
                        <RadioGroupItem
                          value="brand"
                          id="qr-logo-brand"
                          className="sr-only"
                        />
                        <span>Brand Mark</span>
                      </label>

                      <label
                        htmlFor="qr-logo-custom"
                        className={cn(
                          "border-border inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                          field.value === "custom" &&
                            "bg-accent text-accent-foreground border-primary/20",
                          !isPro &&
                            "cursor-not-allowed opacity-60 hover:bg-transparent",
                        )}
                        title={!isPro ? "PRO feature" : undefined}
                      >
                        <RadioGroupItem
                          value="custom"
                          id="qr-logo-custom"
                          className="sr-only"
                          disabled={!isPro}
                        />
                        <span>Custom Logo</span>
                        {!isPro && (
                          <span className="ml-1 rounded-sm bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            PRO
                          </span>
                        )}
                      </label>

                      <label
                        htmlFor="qr-logo-none"
                        className={cn(
                          "border-border inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                          field.value === "none" &&
                            "bg-accent text-accent-foreground border-primary/20",
                          !isPro &&
                            "cursor-not-allowed opacity-60 hover:bg-transparent",
                        )}
                        title={!isPro ? "PRO feature" : undefined}
                      >
                        <RadioGroupItem
                          value="none"
                          id="qr-logo-none"
                          className="sr-only"
                          disabled={!isPro}
                        />
                        <span>No Logo</span>
                        {!isPro && (
                          <span className="ml-1 rounded-sm bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            PRO
                          </span>
                        )}
                      </label>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {logoMode === "custom" && isPro && (
              <div className="animate-in fade-in slide-in-from-top-2 pt-2 duration-200">
                <FormField
                  control={form.control}
                  name="qrCustomLogoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Logo Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/logo.png"
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Preview Column */}
        <div className="flex flex-col items-center justify-start gap-4 lg:w-[280px] lg:shrink-0">
          <div className="text-muted-foreground self-start text-sm font-medium lg:self-center">
            Preview
          </div>

          <div
            className="border-border/50 shadow-raised relative flex items-center justify-center overflow-hidden rounded-xl border bg-white ring-1 ring-black/5"
            style={{
              width: "240px",
              height: "240px",
            }}
          >
            {/* Transparent background pattern for preview container if transparentBg is active */}
            {transparentBg && (
              <div
                className="pointer-events-none absolute inset-0 z-0 opacity-20"
                style={{
                  backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)`,
                  backgroundSize: `20px 20px`,
                  backgroundPosition: `0 0, 0 10px, 10px -10px, -10px 0px`,
                }}
              />
            )}
            <div className="relative z-10 scale-[0.85]">
              {/* No key: the code refreshes in place when the link is
                  created or the style changes, instead of remounting. */}
              <QrCode
                value={qrValue}
                size={qrStyle.size}
                ecc={qrStyle.ecc}
                fg={qrStyle.fg}
                bg={qrStyle.bg}
                margin={getQrMarginSize(qrStyle)}
                logo={logo}
                title={
                  createdShortLink
                    ? `QR code for ${qrValue}`
                    : "Placeholder QR code"
                }
              />
            </div>
          </div>

          <p className="text-muted-foreground px-4 text-center text-xs break-all lg:px-0">
            {createdShortLink
              ? shortUrl
              : "Placeholder preview. Create the link to download this QR code."}
          </p>

          <div className="grid w-full grid-cols-2 gap-2 px-4 lg:px-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSvg}
              disabled={!createdShortLink}
              className="w-full gap-2"
            >
              <Download className="size-3.5" />
              SVG
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadPng}
              disabled={!createdShortLink}
              className="w-full gap-2"
            >
              <Download className="size-3.5" />
              PNG
            </Button>
          </div>

          {shortUrl && (
            <a
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-medium underline decoration-dotted underline-offset-4 transition-colors"
              target="_blank"
              rel="noreferrer"
              href={(() => {
                const parts = String(shortUrl).split("/");
                const slug = parts[parts.length - 1] || "";
                const params = new URLSearchParams();
                const hostedLogoMode =
                  !isPro && qrStyle.logoMode !== "brand"
                    ? "brand"
                    : qrStyle.logoMode;
                params.set("format", "png");
                params.set("size", String(qrStyle.size));
                params.set("fg", qrStyle.fg);
                params.set("bg", qrStyle.bg);
                params.set("margin", String(getQrMarginSize(qrStyle)));
                params.set("ecc", qrStyle.ecc);
                params.set("logoMode", hostedLogoMode);
                if (hostedLogoMode === "custom" && qrStyle.customLogoUrl) {
                  params.set("logoUrl", qrStyle.customLogoUrl);
                }
                if (Number.isFinite(qrStyle.logoScale)) {
                  params.set("logoScale", String(qrStyle.logoScale));
                }
                return `/api/qr/${slug}?${params.toString()}`;
              })()}
            >
              <CloudDownload className="size-3.5" />
              Open hosted image
            </a>
          )}
        </div>
      </div>
    </Inset>
  );
}

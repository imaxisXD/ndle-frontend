"use client";

import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useWatch } from "react-hook-form";
import { ColorSelector } from "@/components/collection/ColorSelector";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { Palette, Download, CloudDownload } from "iconoir-react";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/base-collapsible";
import { ChevronDown } from "lucide-react";
import { COLLECTION_COLORS } from "@/components/collection/colors";

type Props = {
  form: any;
  isPro?: boolean;
};

export function OptionQRCode({ form, isPro = false }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [colorPanelOpen, setColorPanelOpen] = useState(false);

  const [
    urlValue,
    size,
    fg,
    bg,
    transparentBg,
    includeMargin,
    logoMode,
    logoScale,
    customLogoUrl,
  ] = useWatch({
    control: form.control,
    // watching all relevant fields ensures this component re-renders on change
    name: [
      "url",
      "qrSize",
      "qrFg",
      "qrBg",
      "qrTransparentBg",
      "qrIncludeMargin",
      "qrLogoMode",
      "qrLogoScale",
      "qrCustomLogoUrl",
    ] as const,
  }) as [
    string,
    number,
    string,
    string,
    boolean,
    boolean,
    "brand" | "custom" | "none",
    number,
    string,
  ];
  const shortUrl: string | undefined = useWatch({
    control: form.control,
    name: "shortUrl",
  });

  // Always use the highest error correction level for reliability
  const ecc: "H" = "H";

  const logoSrc = useMemo(() => {
    // Only custom logos are embedded via imageSettings; brand uses on-canvas text overlay.
    if (logoMode === "custom" && isPro && customLogoUrl.trim()) {
      return customLogoUrl.trim();
    }
    return null;
  }, [logoMode, isPro, customLogoUrl]);

  const imageSettings = useMemo(() => {
    if (!logoSrc) return undefined;
    const px = Math.max(8, Math.round(size * logoScale));
    return {
      src: logoSrc,
      height: px,
      width: px,
      excavate: true,
      crossOrigin: "anonymous" as const,
    };
  }, [logoSrc, size, logoScale]);

  // ensure QRCodeSVG fully re-renders on any visual change
  const qrKey = useMemo(
    () =>
      [
        urlValue || "",
        size,
        includeMargin ? 1 : 0,
        "H",
        fg,
        transparentBg ? "transparent" : bg,
        logoSrc || "none",
        Number.isFinite(logoScale) ? logoScale.toFixed(3) : "0.18",
      ].join("|"),
    [urlValue, size, includeMargin, fg, bg, transparentBg, logoSrc, logoScale],
  );

  const svgElement = () => {
    const container = previewRef.current;
    if (!container) return null;
    return container.querySelector("svg") as SVGSVGElement | null;
  };

  function addBrandOverlayToSvg(svg: SVGSVGElement) {
    if (!svg) return;
    if (logoMode !== "brand") return;
    const ns = "http://www.w3.org/2000/svg";
    const S = Number(svg.getAttribute("width") || size) || size;
    const g = document.createElementNS(ns, "g");
    g.setAttribute("pointer-events", "none");
    g.setAttribute("aria-label", "ndle brand mark");
    const diameter = Math.max(8, Math.round(S * (logoScale || 0.18)));
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", String(S / 2 - diameter / 2));
    rect.setAttribute("y", String(S / 2 - diameter / 2));
    rect.setAttribute("width", String(diameter));
    rect.setAttribute("height", String(diameter));
    rect.setAttribute("rx", String(diameter / 5));
    rect.setAttribute("fill", "white");
    rect.setAttribute("opacity", "0.95");
    const text = document.createElementNS(ns, "text");
    text.setAttribute("x", String(S / 2));
    text.setAttribute("y", String(S / 2));
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("font-size", String(Math.round(diameter * 0.7)));
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-family", "var(--font-doto), system-ui, sans-serif");
    text.setAttribute("fill", fg || "#000000");
    text.textContent = "N";
    g.appendChild(rect);
    g.appendChild(text);
    svg.appendChild(g);
  }

  const downloadSvg = () => {
    const svg = svgElement();
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(size));
    clone.setAttribute("height", String(size));
    addBrandOverlayToSvg(clone);
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qr.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    const svg = svgElement();
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(size));
    clone.setAttribute("height", String(size));
    addBrandOverlayToSvg(clone);
    const xml = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = "qr.png";
    a.click();
  };

  return (
    <div className="border-border bg-muted/20 rounded-lg border p-4 md:p-6">
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
                render={({ field }) => (
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
                        className={cn(
                          "border-border hover:bg-muted/50 inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
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
                          className="bg-background"
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
            ref={previewRef}
            className="border-border/50 relative flex items-center justify-center overflow-hidden rounded-xl border bg-white shadow-sm ring-1 ring-black/5"
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
              <QRCodeSVG
                key={qrKey}
                value={urlValue || "https://ndle.link/preview"}
                size={size}
                level={ecc}
                fgColor={fg}
                bgColor={transparentBg ? "transparent" : bg}
                imageSettings={imageSettings}
                // Always maintain margin if included to keep QR size consistent
                marginSize={includeMargin ? 2 : 0}
              />
            </div>
            {logoMode === "brand" ? (
              <div
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm ring-2 ring-white select-none"
              >
                <span className="font-doto flex h-10 w-10 items-center justify-center rounded-full text-2xl font-black text-black">
                  n
                </span>
              </div>
            ) : null}
          </div>

          <div className="grid w-full grid-cols-2 gap-2 px-4 lg:px-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={downloadSvg}
              disabled={!urlValue}
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
              disabled={!urlValue}
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
                params.set("format", "png");
                params.set("size", String(size ?? 512));
                params.set("fg", fg ?? "#000000");
                params.set(
                  "bg",
                  transparentBg ? "transparent" : (bg ?? "#ffffff"),
                );
                params.set("margin", includeMargin ? "2" : "0");
                params.set("ecc", "H");
                params.set("logoMode", isPro ? logoMode : "brand");
                if (isPro && logoMode === "custom" && customLogoUrl) {
                  params.set("logoUrl", customLogoUrl);
                }
                if (Number.isFinite(logoScale)) {
                  params.set("logoScale", String(logoScale));
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
    </div>
  );
}

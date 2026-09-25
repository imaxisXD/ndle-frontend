// @vitest-environment node
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { expect, test, vi } from "vitest";
import { Form } from "@/components/ui/form";
import { OptionQRCode } from "@/components/url-shortener/OptionQRCode";
import type { UrlFormValues } from "@/components/url-shortener";
import { makeShortLink } from "@/lib/config";

// Expose the encoded value; the real component only renders module paths.
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) =>
    createElement("svg", { "data-qr-value": value }),
}));

function QrOption({ shortUrl }: { shortUrl?: string }) {
  const form = useForm<UrlFormValues>({
    defaultValues: {
      url: "https://destination.example/landing",
      shortUrl,
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
    },
  });
  // Children are passed positionally; the props type only lists them as required.
  return createElement(
    Form<UrlFormValues>,
    form as Parameters<typeof Form<UrlFormValues>>[0],
    createElement(OptionQRCode, { form }),
  );
}

function render(shortUrl?: string) {
  const markup = renderToStaticMarkup(createElement(QrOption, { shortUrl }));
  const download = (label: string) =>
    markup.match(
      new RegExp(`<button(?:(?!<button)[\\s\\S])*?${label}</button>`),
    )?.[0];
  return {
    markup,
    encoded: markup.match(/data-qr-value="([^"]*)"/)?.[1],
    svgDisabled: download("SVG")?.includes('disabled=""'),
    pngDisabled: download("PNG")?.includes('disabled=""'),
  };
}

test("before the link exists the QR code is a placeholder and cannot be downloaded", () => {
  const result = render();
  expect(result.encoded).toBe(`https://${makeShortLink("your-link")}`);
  expect(result.markup).not.toContain("destination.example");
  expect(result.svgDisabled).toBe(true);
  expect(result.pngDisabled).toBe(true);
  expect(result.markup).toContain("Placeholder preview.");
});

test("after creation the QR code encodes the short link on the chosen domain", () => {
  const result = render("links.example.test/abc123");
  expect(result.encoded).toBe("https://links.example.test/abc123");
  expect(result.markup).not.toContain("destination.example");
  expect(result.svgDisabled).toBe(false);
  expect(result.pngDisabled).toBe(false);
});

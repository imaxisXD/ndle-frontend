"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { buildUtmUrl, mixedCaseFields, type UtmField } from "@/lib/utm";
import { ActionLink, FOCUS } from "@/app/home-2/_components/kit";

/* The public UTM builder. Everything happens in the browser: nothing is sent
   anywhere, so it costs nothing to run. */

const SIGN_UP = "/sign-up?redirect_url=/dashboard";

const FIELDS: Array<{ key: UtmField; label: string; hint: string; required?: boolean; suggestions?: string[] }> = [
  {
    key: "utm_source",
    label: "Source",
    hint: "Where the click comes from: google, newsletter, instagram",
    required: true,
    suggestions: ["google", "facebook", "instagram", "linkedin", "tiktok", "youtube", "x", "newsletter", "email"],
  },
  {
    key: "utm_medium",
    label: "Medium",
    hint: "The kind of channel: email, social, cpc, referral",
    required: true,
    suggestions: ["email", "social", "cpc", "referral", "display", "affiliate", "qr", "sms"],
  },
  { key: "utm_campaign", label: "Campaign", hint: "The promotion: spring_sale, launch_week", required: true },
  { key: "utm_content", label: "Content", hint: "Which link or ad, if there are several: header_button" },
  { key: "utm_term", label: "Term", hint: "The paid keyword, for search ads" },
  { key: "utm_id", label: "Campaign ID", hint: "Your ad platform's campaign ID, if you use one" },
];

const INPUT =
  "h-10 w-full min-w-0 rounded-md border border-border bg-white px-3 font-mono text-sm text-[var(--fg)] shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--fg-3)] focus:border-[oklch(0.78_0.15_88)] focus:ring-[3px] focus:ring-[oklch(0.86_0.17_88/0.35)]";

export function UtmBuilder() {
  const [page, setPage] = useState("");
  const [values, setValues] = useState<Partial<Record<UtmField, string>>>({});
  const [copied, setCopied] = useState(false);

  const built = buildUtmUrl(page, values);
  const missing = FIELDS.filter((field) => field.required && !values[field.key]?.trim()).map((field) => field.label.toLowerCase());
  const capitals = mixedCaseFields(values).map((key) => FIELDS.find((field) => field.key === key)?.label.toLowerCase());

  const copy = async () => {
    if (!built) return;
    try {
      await navigator.clipboard.writeText(built);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="border-2 border-[#141312] bg-white p-5 sm:p-6">
      <label htmlFor="utm-page" className="block text-sm font-medium text-[#141312]">
        Page address
      </label>
      <input
        id="utm-page"
        type="text"
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={page}
        onChange={(event) => setPage(event.target.value)}
        placeholder="yoursite.com/spring-sale"
        className={cn(INPUT, "mt-1.5")}
      />

      <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={field.key} className="flex items-baseline gap-2 text-sm font-medium text-[#141312]">
              {field.label}
              <span className="font-mono text-[11px] font-normal text-[#3d3d3d]">
                {field.key}
                {field.required ? "" : " · optional"}
              </span>
            </label>
            <input
              id={field.key}
              type="text"
              autoComplete="off"
              spellCheck={false}
              list={field.suggestions ? `${field.key}-options` : undefined}
              value={values[field.key] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              aria-describedby={`${field.key}-hint`}
              className={cn(INPUT, "mt-1.5")}
            />
            {field.suggestions && (
              <datalist id={`${field.key}-options`}>
                {field.suggestions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </datalist>
            )}
            <p id={`${field.key}-hint`} className="mt-1 text-xs leading-5 text-[#3d3d3d]">
              {field.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-[var(--line)] pt-5" aria-live="polite">
        <p className="text-sm font-medium text-[#141312]">Your campaign link</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
          <code className="min-h-10 min-w-0 flex-1 rounded-md bg-black/[0.04] px-3 py-2.5 font-mono text-[13px] leading-5 [overflow-wrap:anywhere] text-[#141312]">
            {built || <span className="text-[#3d3d3d]">Fill in the page address to see it.</span>}
          </code>
          <button
            type="button"
            onClick={copy}
            disabled={!built}
            className={cn(
              "border-border inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md border bg-white px-3 text-sm font-medium text-[var(--fg)] shadow-xs transition-colors hover:bg-[oklch(0.96_0_0)] disabled:opacity-50",
              FOCUS,
            )}
          >
            {copied ? <CheckIcon size={14} weight="bold" /> : <CopyIcon size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {built && (missing.length > 0 || capitals.length > 0) && (
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-amber-800">
            {missing.length > 0 && (
              <li className="flex items-start gap-1.5">
                <WarningCircleIcon size={14} className="mt-0.5 shrink-0" />
                Google recommends always setting source, medium and campaign. Missing: {missing.join(", ")}.
              </li>
            )}
            {capitals.length > 0 && (
              <li className="flex items-start gap-1.5">
                <WarningCircleIcon size={14} className="mt-0.5 shrink-0" />
                Values are case sensitive, so &ldquo;Facebook&rdquo; and &ldquo;facebook&rdquo; count as two sources. Check the{" "}
                {capitals.join(" and ")}.
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--line)] pt-5">
        <p className="text-sm text-[#141312]">Long link? ndle shortens it and counts every click by campaign.</p>
        <ActionLink href={SIGN_UP}>Shorten it free</ActionLink>
      </div>
    </div>
  );
}

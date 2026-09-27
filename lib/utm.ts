/* Campaign links: a page address with UTM parameters. Shared by the link form's
   UTM builder and the public UTM builder tool (app/tools/utm-builder).
   Google Analytics reads these parameters; source, medium and campaign should
   always be set, and values are case sensitive.
   https://support.google.com/analytics/answer/10917952 */

export const UTM_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
] as const;

export type UtmField = (typeof UTM_FIELDS)[number];

/** The page with each non-empty parameter set (replacing any already there),
    or "" when the address isn't a web page. Adds https:// when it's missing. */
export function buildUtmUrl(baseUrl: string, params: Partial<Record<string, string>>): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    if (!url.hostname.includes(".")) return "";
    for (const [key, value] of Object.entries(params)) {
      if (value && value.trim() !== "") url.searchParams.set(key, value.trim());
    }
    return url.toString();
  } catch {
    return "";
  }
}

/** Parameter values with capitals: Analytics counts "Facebook" and "facebook"
    as two different sources. */
export function mixedCaseFields(params: Partial<Record<UtmField, string>>): UtmField[] {
  return UTM_FIELDS.filter((field) => {
    const value = params[field]?.trim();
    return !!value && value !== value.toLowerCase();
  });
}

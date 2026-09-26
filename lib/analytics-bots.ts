/**
 * Bots are included in analytics unless the viewer turns on the "exclude
 * bots" filter, sent by the browser as `exclude_bots=true`.
 */
export function forwardExcludeBots(
  incoming: URLSearchParams,
  backendUrl: URL,
): void {
  if (incoming.get("exclude_bots") === "true")
    backendUrl.searchParams.set("excludeBots", "true");
}

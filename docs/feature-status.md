# Feature status: what the landing pages claim vs what ships

Internal. Checked against the code on 2026-09-27. The landing copy on `/home-2`
only promises what is marked **Ships**. When a pending item ships, update this
table and the copy together.

## Monitoring (the headline feature)

| Claim on `/` (and old `/home-2` copy) | What the code does | Status | Where |
|---|---|---|---|
| Checked every 60 seconds | Production checks run every 30 minutes at the fastest. Shorter requested intervals are raised to 30 minutes. | **Pending** (60s) | `ndle-link-monitoring/src/lib/monitor-policy.ts` (`PRODUCTION_MONITORING_INTERVAL_MS`) |
| Checked from 4 regions | One worker on one VPS. There's no region concept in the monitor. | **Pending** | `ndle-link-monitoring/README.md` ("Destination safety") |
| Emails you when a link breaks, and again when it's back | Status changes create `linkIncidents` rows, shown under Recent incidents on the Monitoring page. No email goes to the link owner. The only email code is the ops alert in `ndle-worker`, sent to `OPS_ALERT_TO`. | **Pending** (user emails) | `convex/linkHealth.ts`, `ndle-worker/src/operations.ts` |
| In-app notification bell | `NotificationCenter` uses mock data and is commented out of the sidebar. | **Pending** | `components/notification-center.tsx`, `components/sidebar.tsx` |
| Warns when a link slows down | A check slower than `DEGRADED_THRESHOLD_MS` (3,000 ms by default) marks the link `degraded` and opens a warning incident. | **Ships** | `ndle-link-monitoring/src/lib/constants.ts` |
| Catches an expired SSL certificate | A TLS failure is reported as "Secure connection failed" and counts as `down`. | **Ships** | `ndle-link-monitoring/README.md` ("Check results") |
| Catches a deleted page | 404 and 410 count as `down`. | **Ships** | same |
| A **503** as the example failure | 503 (with 401, 403, 405, 406 and 429) is classified `unknown`: it opens no incident and doesn't count against uptime. Use 404, a timeout or an SSL failure in examples instead. | Copy must not use 503 | same |
| Uptime and latency history per link | Daily summaries and per-check history. | **Ships** | `convex/schema.ts` (`linkHealthChecks`, `linkHealthDailySummary`) |
| Guest links aren't monitored | Correct. | **Ships** | |

## Plan limits

| Claim | What the code does | Status | Where |
|---|---|---|---|
| 100 short links **per month** | 100 **active** links in total on the free plan. | Copy fixed to "100 active links" | `convex/ownership.ts` (`FREE_ACTIVE_LINK_LIMIT`) |
| 1 custom domain free | `MAX_DOMAINS_FREE = 1` (Pro: 3). | **Ships** | `convex/customDomains.ts` |
| Guest links: no sign-up, last 7 days | 7-day expiry, 5 guest links a day per guest. | **Ships** | `convex/ownership.ts` |
| Unlimited QR codes | QR style and download support on every link. | **Ships** | `lib/qr.ts`, `urls.qrEnabled` |
| Custom back-halves (`ndle.fyi/spring-menu`) | Not offered. Slugs are six random characters, or readable words on Pro. Examples in copy must look like `ndle.fyi/k3x9qa`. | **Pending** | `convex/utils.ts` (`createSlug`) |
| Link expiry dates | Up to 30 days ahead on the free plan; longer on Pro. | **Ships** | `convex/urlMainFuction.ts` (`validateSignedInPlan`) |
| A/B split links, readable-word slugs, custom QR logos | Pro only, and Pro isn't sold yet. Don't list them as free features. | Pro only | same |

## "On every plan" list

| Feature | Status | Notes |
|---|---|---|
| UTM builder | **Ships** | `utm_templates` table |
| Click analytics (day, country, device, referrer, UTM) | **Ships** | |
| Collections (folders) | **Ships** | |
| AI chart builder ("ask your links") | **Pending, planned for the swap** | The route exists, but `components/analytics.tsx:130` only enables it when `NODE_ENV === "development"` for Pro users. Production users see "This works only in dev mode right now." Decision: turn it on in production before `/home-2` replaces `/`. The tour's Ask section, the hero's "Ask AI" chapter, the bento and `ask-card.tsx` show it. The comparison table's AI row was removed and can come back at the swap. |
| A/B split redirects | **Ships** | `ndle-worker/src/redirect-decision.ts`, `components/url-shortener/OptionABTesting.tsx` |
| Link expiry dates | **Ships** | `components/url-shortener/OptionScheduling.tsx` |
| Edit a link's destination after it's created | **Pending** | `LinkSettingsPanel` has an `onUpdateDestination` prop, but nothing passes it and there's no update mutation. This matters for the QR pitch: "change where a printed QR code goes" can't be claimed yet. |
| API access | **Pending** | The API settings panel in `components/settings.tsx` is commented out, and there's no API key storage. |
| Webhooks | **Pending** | Only in `convex/roadmap.md`. |
| Password-protected links | **Pending** | No password field on `urls`. |
| Link tags | **Pending** | A `tags` field exists in the analytics projection, but there's no UI. |
| CSV export | **Pending** | No export code found. |
| Team features | **Pending** | No teams or workspaces in the schema. |

## Decisions (2026-09-27)

- **The AI chart builder goes live in production before the swap** (relayed
  from the other session). If it slips, remove the Ask sections and the bento
  tile first.
- **Update 2026-09-28: `/home-2` replaced `/` before owner emails and the production AI chart builder shipped.** You chose to swap now and ship them soon, accepting the gap. Until they ship, the live home page promises both. Ship them next, or change the lines below.
- **Owner emails ship before `/home-2` replaces `/`** (the original plan). The email visuals in the
  hero demo and the tour's 3:04 AM section stay. The FAQ answer "When a check
  fails, ndle emails you", the bento's inbox tile and the closing section (its toast
  "We emailed you" and "tell you when they break") also depend on it. If emails slip, change those
  places before the swap. The blog doesn't mention emails, so it can ship first.
- **Public promise:** no ad page before any link, and links on a free account
  don't expire unless the owner sets a date. This is on `/home-2` (hero note,
  comparison table, FAQ). Keep it true: no interstitials, no expiry of free
  links, no scan limits on QR codes.
- The slow-response threshold is `DEGRADED_THRESHOLD_MS`, 3,000 ms unless the
  environment overrides it, so the copy just says "slow responses are flagged".

## Order to ship, for marketing impact

1. **Owner emails on break and recovery.** This is the promise the whole page and the SEO plan are built around ("tells you when it breaks"). Until it ships, the copy can only say ndle *shows* breakages on the dashboard.
2. **Faster checks** (5 minutes, then 60 seconds). LinkShortener.io and BL.INK check daily and QR Planet weekly, so 30 minutes already beats them. UptimeRobot's free tier is 5 minutes.
3. **Checks from more than one region.** This helps tell a real outage apart from a local network blip.
4. API access and CSV export. People comparing shorteners ask for these.
5. Password links, tags, webhooks and teams.
6. **Soft-404 detection** for affiliate and shop links. Many dead product pages
   return 200 OK with "Currently unavailable" or "out of stock" text (r/juststart,
   r/SideProject). Status-code checks can't see this. It would need body sampling,
   and the monitor currently stops after the response headers.

## Competitor facts to re-check

The comparison table on `/` and `/home-2` uses public plans from April 2026.
Recheck them before the swap. Bitly Free was still 5 links and 2 QR codes a month,
with no custom domain, on 2026-09-27 (https://bitly.com/pages/pricing).
Dub's public pricing page and its own Bitly comparison page disagree about its
cheapest plan.

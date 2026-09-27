# SEO plan

Internal. Research done 2026-09-27: competitor sites, Google autocomplete, US
search results, and Reddit, Hacker News and review sites. There are no paid SEO
tools behind this, so every search volume here is a guess. Check the real numbers
in Google Search Console and Keyword Planner once the site is verified.

Copy must only promise what ships. See [feature-status.md](./feature-status.md).

## 1. Where ndle can win

- **Head terms are out of reach for now.** "url shortener", "link shortener" and
  "free url shortener" are held by Bitly, TinyURL, Short.io, Rebrandly, Canva,
  rb.gy and Zapier's listicle.
- **None of the big shorteners markets destination checks.** Bitly's own help
  post tells users to "regularly review the health of your short links" by hand.
  Rebrandly keeps a hidden list of broken branded links with no alerts. Dub's
  "Link Inspector" and Rebrandly's "Link checker" only check whether a link is
  *safe*.
- **Small players do market it:**
  - LinksWatch: "Catch broken links before your customers do"; automatic checks
    only on its $9 a month plan.
  - LinkShortener.io: daily checks on paid plans.
  - BL.INK: a daily report, Enterprise only.
  - QR Planet: weekly.
  - JotURL: doesn't say how often it checks.
  - Avoid LinksWatch's phrases: "before your customers do", "stay alive".
- **What ndle can honestly claim today:**
  - Every signed-in link is checked automatically every 30 minutes, on the free
    plan.
  - It catches 404s, timeouts, failed connections, expired or broken SSL, and
    slow responses (over 3 seconds).
  - Each link keeps its uptime and latency history.
  - One free custom domain; Bitly's free plan has none.
- **Not yet:** owner emails, 60-second checks, several regions (see
  feature-status.md). When emails ship, the pitch moves from "shows you" to
  "tells you", which is much stronger.
- **People search for the symptom, not for "link monitoring".** Google reads
  "link monitoring" and "url monitoring" as networking and APM products. Use the
  searchers' words: *broken*, *stopped working*, *not working*, *dead link*,
  *404*, *expired*.

## 2. Keyword targets

All volumes are guesses.

| Page | Primary | Secondary |
|---|---|---|
| Home (`/`, the former `/home-2`) | free URL shortener that checks for broken links | free URL shortener with analytics; free Bitly alternative; link shortener with a free custom domain; URL shortener with no sign-up |
| `/alternatives/bitly` | free bitly alternative | bitly alternative with free analytics; bitly alternative no sign up; bitly alternative without ads; bitly free plan limits |
| Link-checker tool | check if a link is working | url status checker; dead link checker free; redirect checker; is this link broken |
| QR use case | qr code stopped working | qr code not working when printed; do qr codes expire; qr code url checker |
| Affiliate use case | url shortener for affiliate links | affiliate link checker; broken affiliate links |

**Avoid for now:**
- "url shortener" and "link shortener" as primaries.
- "broken link checker": searchers want to crawl their own website.
- "link monitoring" and "url monitoring": networking intent.
- "website down alert": UptimeRobot's category.
- Anything with "earn money" or "high CPM": ad-shortener spam.

## 3. Technical SEO checklist

Found by fetching ndle.app as Googlebot on 2026-09-27.

| # | Issue | Fix | Where |
|---|---|---|---|
| T1 | `/robots.txt` and `/sitemap.xml` return **307 redirects to /sign-in**. The middleware protects every path it doesn't list as public, and its matcher lets `.txt` and `.xml` through. | **Done (not deployed):** `app/robots.ts` blocks the API and app paths and points to the sitemap; `app/sitemap.ts` lists `/`; both paths are public in `middleware.ts`. After deploying, submit the sitemap in Search Console. | `app/robots.ts`, `app/sitemap.ts`, `middleware.ts` |
| T2 | Every new marketing page (blog, compare, tools) will redirect to sign-in the same way. | Flip the middleware: protect the app routes and leave everything else public, or add a `/(blog\|compare\|alternatives\|tools\|use-cases)(.*)` matcher. Do this before publishing any content. | `middleware.ts` |
| T3 | ~~No `<link rel="canonical">` anywhere.~~ **Done:** `/` declares its canonical, app paths are noindex, blog pages set their own. | Add `alternates: { canonical: "/" }` per page. When `/home-2` replaces `/`, 301 `/home-2` to `/`. | `app/layout.tsx`, page metadata |
| T4 | **Done:** sign-in and sign-up have their own titles and `noindex`. Before: `/sign-up` was indexed with the homepage's title ("ndle - Short. Sharp. Smarter."), so it competes with the homepage on brand searches. | Give the auth pages their own titles and `robots: { index: false }`. | `app/sign-in`, `app/sign-up` |
| T5 | The title and meta description don't mention the differentiator. "Smarter" collides with Rebrandly's H1, "Smarter links, better results". | **Done on `/home-2`:** "ndle: Free URL Shortener That Catches Broken Links", plus a new description and OG/Twitter text. Carry them into `app/layout.tsx` at the swap. The footer tagline "Short. Sharp. Smarter." is still there. | `app/home-2/page.tsx` |
| T6 | No structured data. | **Done on `/home-2`:** `WebSite`, `SoftwareApplication` (free `Offer`, author) and `FAQPage` JSON-LD. Google now shows FAQ rich results only for government and health sites, but the markup still helps AI answers. Blog posts need `Article`. | `app/home-2/page.tsx` |
| T7 | **Blog done:** `/blog` and every post get a build-time card (`app/blog/_components/og.tsx`). **Still to do for `/`.** The OG image is out of date. It shows "Short. Sharp. Smarter." and a dashboard screenshot on the **dev.ndle.im** domain. | A new 1200×630 image, or `opengraph-image.tsx` rendered with `next/og` at build time. | `public/opengraph-image.webp` |
| T8 | ~~Moot: `PublicHome.tsx` was deleted at the swap.~~ The old `/` put decorative words in the crawlable text ("BZZT!" and "PING!", six times each). | Draw them with CSS or drop them. `/home-2` doesn't have them. | `components/PublicHome.tsx` |
| T9 | ~~Moot after the swap.~~ The old H1 was just "Short links,". | `/home-2`'s H1 is "Short links, watched." as real text. | done in `/home-2` |
| T10 | The page is heavy: about 770 KB of compressed JS and CSS in 21 scripts. The root layout loads 10 font families on every route (Doto, Sigmar, Bangers, Caveat, Geist Mono and five Geist Pixel faces). Clerk and Convex load on the landing page. | Load fonts only in the routes that use them. Measure with Lighthouse or PageSpeed Insights: the public PageSpeed API was over its daily quota during this audit, so there are no Core Web Vitals numbers yet. | `app/layout.tsx` |
| T11 | Unknown paths get a 307 to sign-in instead of a 404. | Acceptable for app paths. Make sure marketing paths return real 404s. | `app/[[...path]]/page.tsx` |
| T12 | Not verified in Search Console or Bing Webmaster Tools. | Verify both and submit the sitemap. Bing also feeds ChatGPT search and Copilot. | |
| T13 | **Done:** `public/llms.txt` (public in `middleware.ts`); add new posts to it. Optional: `llms.txt`, a plain summary of what ndle does and its main pages, for AI crawlers. | Zero cost. | `public/llms.txt` |
| T14 | **Done 2026-09-28 (not deployed):** the landing page is `/`, with its metadata in `app/home-2/_components/home-page.tsx` (canonical `/`, no noindex). `/home-2` and `/landing-v2` redirect permanently to `/`, and `HOME_PATH` is `/`. | Follow-up: `/` renders per request, because it's served by the `[[...path]]` catch-all whose layout asks Clerk for request data. To make it static, give the home page its own `app/page.tsx` and turn the catch-all into `[...path]`. | `app/home-2/page.tsx`, `home-two.tsx` |
| T15 | The hero demo and the product components inside the page render their own headings (an `h2` "ndle" from the demo's page header, "Live Click Counter"), so crawlers see them in the outline. | Minor. Render the demo's headings as `p`/`span` if you want a clean outline. | `demo-pages.tsx`, `components/charts/live-click-hero.tsx` |
| T16 | Every page was rendered on each request. `<ClerkProvider dynamic>` in the root layout made all routes dynamic, and OpenNext's default "dummy" cache re-rendered even static routes on Cloudflare. | **Done (not deployed):** the root `ClerkProvider` is static, and `dynamic` is only in `app/[[...path]]/layout.tsx` (Clerk's recommended pattern). `open-next.config.ts` uses the read-only static-assets cache with cache interception (OpenNext's recommended setup for static sites). `/home-2`, `/robots.txt` and `/sitemap.xml` now build as static and are copied into `.open-next/assets/cdn-cgi/_next_cache`. Deploy with `opennextjs-cloudflare deploy` (the `deploy` script): that step copies the cache. A plain `wrangler deploy` skips it, and pages then render per request. | `app/layout.tsx`, `app/[[...path]]/layout.tsx`, `open-next.config.ts` |

## 4. Content plan

There are no crawlable pages besides the homepage today. **Blog and marketing pages must build as static (`○` or `●` in `next build`):** use `generateStaticParams` with `dynamicParams = false`, and don't call `auth()`, `cookies()` or `headers()` in them. The pages below target
queries where small sites already rank on page one. Build the blog as **MDX
files in this repo, statically generated**. That costs nothing to run and adds
no Convex reads. Each page needs its own title, meta description, canonical,
OG image and dates, and should link to the homepage and to the most relevant
tool.

### How the blog is built (2026-09-27)

- **Posts** are MDX files in `content/blog/<slug>.mdx`. Each is listed in
  `app/blog/posts.ts` with its title, description (155 characters at most),
  dates, tags, contents list and index-card diagram.
  `app/blog/posts.test.ts` fails if the contents list doesn't match the post's
  `##` headings.
- **Diagrams** are code-built pieces in `app/blog/_components/diagrams.tsx`
  (`Figure`, `QrPath`, `StaticVsDynamic`, `FailedCheck`), in the landing
  bento's ink style. Write new ones there rather than using screenshots.
- **Pages:** `/blog` and `/blog/<slug>` build as static (`○` and `●`). They
  carry a canonical URL, OG/Twitter tags and `BlogPosting` JSON-LD, and they
  appear in `app/sitemap.ts` automatically. `/blog(.*)` is public in
  `middleware.ts`.
- **To add a post:** write the MDX, add its entry at the top of `POSTS`, run
  `pnpm test`. Claims about ndle must match
  [feature-status.md](./feature-status.md).
- **Linked from:** the shared nav and footer (`app/home-2/_components/site-nav.tsx`,
  `site-footer.tsx`), the live `/` footer, and a "More from the blog" list under
  every post. Posts also link to each other in the text.
- **Published (not deployed):** nine posts, dated 27 and 28 September 2026:
  - QR code stopped working? Check the destination first
  - Why is my Bitly link not working? Causes and fixes
  - Do short links expire? Bitly, TinyURL and goo.gl compared
  - Bitly's free plan in 2026: limits, ads and free alternatives
  - What is link rot, and how do you slow it down?
  - How to check if a link is working, step by step
  - UTM parameters, explained: what each one does
  - Do QR codes expire? Static vs dynamic, explained
  - How to shorten a link without an account

  They're marketing copy with competitor facts from each company's own pages
  on those dates. Review them before deploying, and recheck prices before each
  update; Bitly's and Rebrandly's pricing pages A/B test.

### How the comparison pages are built (2026-09-28)

- `/alternatives/<slug>` and `/use-cases/<slug>` share one layout
  (`app/blog/_components/product-article.tsx`). For comparisons, the body is MDX in `content/alternatives/`, and the
  registry `app/alternatives/pages.ts` holds the title, hero, check date and
  questions. The questions render on the page and go out as `FAQPage` data.
- Each page carries a "Where X is ahead" section. Honest comparisons earn trust
  and avoid misleading claims; keep one on every page.
- Each page is static, with its own share card. It's listed in the sitemap and
  linked from the footer's Compare column (`site-footer.tsx`; add a line per page).
- `app/alternatives/pages.test.ts` checks contents against headings, description
  length, title length and that questions exist.
- Recheck competitor facts on the date in `checked` before each update.

### 4a. Comparison pages (highest intent, winnable)

Small sites (urlshort.at, shortpen.com, minily.org, gettrack.link, urlyte.com)
already rank on page one for "bitly alternative free" and "dub alternative".
Put monitoring in the first row of every comparison table. Re-check competitor
prices on the day you publish.

| Priority | URL | Target query |
|---|---|---|
| P1 | ~~`/alternatives/bitly`~~ **built** | free bitly alternative (Bitly Free: 5 links and 2 QR codes a month, no custom domain) |
| P1 | ~~`/alternatives/google-url-shortener`~~ **built** | goo.gl alternative. Google turned off inactive goo.gl links on 2025-08-25. That's a link-rot story ndle fits. |
| P2 | ~~`/alternatives/tinyurl`~~ **built** | tinyurl alternative |
| P2 | ~~`/alternatives/dub`~~ **built** | dub alternative |
| P2 | ~~`/alternatives/short-io`~~ **built** | short.io alternative |
| P3 | ~~`/alternatives/rebrandly`~~ **built** | rebrandly alternatives |

### The link checker (built 2026-09-28, not deployed)

`/tools/link-checker` ("Is this link working?"): paste a link and see a verdict,
the status code, every redirect and the timings. The rules are the same as the
monitor's (`lib/link-check.ts`), so the tool and ndle's checks agree.

**Abuse protection**, in order:
1. The request must come from ndle.app (origin check).
2. The address must be a public site: http or https only, no IP addresses,
   `localhost`, `.local` or `.internal` names, no credentials in the URL, and
   ports 80, 443, 8080 or 8443 only. Every redirect is checked the same way
   before it's followed.
3. **Cloudflare Turnstile** must pass. It runs invisibly and shows a challenge
   only when it's unsure. Tokens are single-use and verified on the server.
4. There's a limit of 20 checks an hour per network, through the existing
   Upstash limiter.

The response carries only status codes and timings, never page content, so the
tool can't be used as a proxy.

**Before deploying, create a Turnstile widget** in the Cloudflare dashboard
(Turnstile → Add widget, hostname `ndle.app`, mode "Managed"). Then:
- Add `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to `vars` in `wrangler.jsonc` and to the
  build environment. It's public and gets baked into the page at build time.
- Run `wrangler secret put TURNSTILE_SECRET_KEY`.

Without the keys the tool fails closed: the page says it isn't available, and
the API returns 503. Development uses Cloudflare's test keys, which always pass.

**Running cost:**
- Each check is one Worker request, up to 22 requests to the checked site
  (HEAD, plus GET where needed, for up to 11 hops), one Turnstile verification
  and one or two Upstash commands.
- Turnstile is free.
- It's well inside the Workers paid plan. On Upstash's free tier (10,000
  commands a day), it's a few thousand checks a day.
- No Convex reads or writes.

### 4b. Free tools (links from other sites, and signups)

| Priority | Tool | Target query | Running cost |
|---|---|---|---|
| P1 | **Built** at `/tools/link-checker` (see above). **Is this link working?** Enter a URL and see the status code, the redirect chain, SSL expiry and the response time, with a "Watch this link" button that leads to sign-up. The top result for "check if link is working" is a blog post, not a tool. | check if link is working; url status checker; redirect checker | **Not free.** Each check is an outbound request. The cheapest option is a rate-limited route in the existing Cloudflare Worker (free tier: 100k requests a day), with no Convex writes. Don't reuse the monitor VPS, because it shares resources with production. |
| P1 | **Built** at `/tools/utm-builder`. **UTM builder** | utm builder; utm link generator | Zero: runs in the browser. |
| P2 | **QR code URL checker**: paste the link printed on a QR code and see whether it still works. | qr code url checker; qr code stopped working | Same route as the link checker. |
| P3 | **Link expander** (unshorten) | unshorten url; where does this link go | Same route as the link checker. |

### 4c. Use-case pages

| Priority | URL | Why |
|---|---|---|
| P1 | ~~`/use-cases/qr-codes`~~ **built** | Printed QR codes can't be changed once they're on menus, flyers and packaging. Only BL.INK (Enterprise) checks their destinations. |
| P1 | `/use-cases/affiliate-links` | A dead product page means lost commission; affiliate tools like Geniuslink and Lasso sell this. **On hold:** most dead affiliate links return 200 with an "unavailable" page, which ndle's status-code checks can't catch (feature-status.md, soft-404 detection). Build it once that ships, or pitch it only for 404s. |
| P2 | ~~`/use-cases/link-in-bio`~~ **built** | "link shortener for instagram" is a top autocomplete. |
| P3 | `/use-cases/newsletters`, `/use-cases/podcasts` | Low demand but cheap to rank for. |

### 4d. Blog posts (symptom and question queries)

| Priority | Title (working) | Target query |
|---|---|---|
| P1 | ~~Why is my Bitly link not working?~~ **written** (`bitly-link-not-working`) | why is my bitly link not working; bitly link stopped working |
| P1 | ~~Do short links expire?~~ **written** (`do-short-links-expire`) | do short links expire; do bitly links expire; do free bitly links expire |
| P1 | ~~QR code stopped working? Check the destination first~~ **written** (`content/blog/qr-code-stopped-working.mdx`) | qr code stopped working; qr code not working when printed |
| P2 | ~~Do QR codes expire?~~ **written** (`do-qr-codes-expire`) | do qr codes expire; what happens when a qr code expires |
| P2 | ~~How to check if a link is working~~ **written** (`check-if-link-is-working`) | check if link is working (supports the tool) |
| P2 | ~~What is link rot?~~ **written** (`what-is-link-rot`) | link rot |
| P2 | ~~Bitly's free plan in 2026~~ **written** (`bitly-free-plan`) | how many bitly links free; is bitly free; free bitly alternative |
| P3 | goo.gl shut down: what happened to your links | google url shortener shutdown |
| P3 | ~~UTM parameters, explained~~ **written** (`utm-parameters-explained`) | utm parameters (supports the UTM tool) |
| P3 | ~~How to shorten a link without an account~~ **written** (`shorten-link-without-account`) | url shortener no sign up |

Voice-of-customer findings (Reddit, Hacker News, reviews) are in section 6 and
should shape the wording of every page above.

## 5. Off-page and domain authority

1. List ndle on G2, Capterra, AlternativeTo, Product Hunt, SaaSworthy and
   SourceForge. These directories rank for "X alternatives" queries themselves.
2. Ask the authors of "best url shortener 2026" roundups (Zapier, Blogging Wizard,
   efficient.app, Elementor, Guideflow) to include ndle. Lead with checks on the
   free plan.
3. Post a Show HN or Indie Hackers launch when owner emails ship. That is the
   moment the story is complete.
4. The public GitHub repos (`imaxisXD/ndle-link-monitoring` is already indexed)
   should link to ndle.app in their READMEs and repo "Website" fields.
5. Answer existing Reddit and forum threads about broken short links and Bitly
   limits only where ndle actually helps, and say that you made it.

## 6. Voice of customer

**Method.** Reddit blocked direct fetches and the browser, so the Reddit quotes
are verbatim search snippets. Hacker News, Trustpilot and G2 pages were read
directly. Pains are ranked by how many separate threads or reviews raised them.

### What people complain about (most common first)

1. **The shortener damages the link itself.** Bitly now shows ads and interstitial
   pages on free links, including links and QR codes already printed:
   - "bitly now puts advertising into your already existing QR [codes]"
     (r/assholedesign, 60+ comments).
   - "Bitly hijacks your traffic with an artificial 10-second countdown screen and
     ad gate" (Trustpilot, 2026).
2. **"QR code hostage."** Trials end and printed codes stop working:
   - "that trial ended the day before the wedding… the QR codes deactivated"
     (r/weddingplanning).
   - "printed the code on 20K fliers and the code stopped working"
     (r/GoogleSites).
   - "Printed 8k retail packages… we didn't check the functionality of the QR code"
     (r/qrcode).
3. **Free plans that don't last.** "Bitly free is basically useless, only 5 links
   per month" (r/AskMarketing, 188 comments). Rebrandly is "curtailing their free
   offering".
4. **Billing tricks and no human support.** Annual-only plans, silent renewals,
   chatbot-only support (Trustpilot, G2).
5. **Suspended without warning.** Links flagged as spam, whole accounts gone
   (Short.io and Bitly reviews on Trustpilot).
6. **The shortener itself goes down or shuts down.** Rebrandly outages, and the
   goo.gl shutdown: "About 60k academic citations about to die" (HN).
7. **Distrust of short links.** "if you see a link that has 'bit.ly' in it, do not
   click it" (r/techsupport). T-Mobile filters bit.ly in SMS (r/twilio).

### Where broken links hurt

1. **Printed QR codes.** This is the strongest, most emotional theme: weddings,
   packaging, flyers, business cards, menus, pub tables.
2. **Affiliate links that die quietly.** "I was literally sending high-intent
   traffic to 'Currently Unavailable' pages" (r/SideProject). Many dead affiliate
   links still return 200 OK (see the product gap below).
3. **Old YouTube descriptions.** "I'm terrified of how many dead links might be
   sitting in my video history" (r/YouTubeCreators).
4. **Emails sent with a broken link.** "sent a fundraising email to 30,000 people
   with a broken link to the donation page" (r/Emailmarketing).
5. **Print and books outliving their links** (HN, r/publishing).

### How people find out today

Almost always someone else tells them, or they notice too late. The rest check
by hand, or never. A few ask outright for what ndle does:
- "is there a way to actually get alerted when a link dies?" (r/YouTubeCreators)
- "get a warning if any of these links stops working. Is there any out-of-the-box
  tool that can do that?" (r/webdev)

### Words to use in copy and headings

dead link · broken link · link stopped working · QR code stopped working ·
QR code expired · QR code deactivated · never expires · unlimited scans ·
no ads · custom domain · link rot · get alerted when a link dies

### Audiences, in order of pain

1. **Printed QR codes:** small businesses, event and wedding hosts, designers
   doing packaging.
2. **Affiliates and creators:** YouTube and blog links that lose revenue silently.
3. **Email and SMS marketers:** one send, no second chance.
4. **Small businesses generally:** price-sensitive, "burned once" by trial traps.
5. **Developers and self-hosters:** they self-host (Shlink, Kutt, YOURLS), so they
   feel less pain and are less likely to pay.

### What this changes in the plan

- **Decided: say "no ads, and your links don't expire" publicly.** It's on
  `/home-2` now; use it on every comparison and QR page too. Source for Bitly's
  ads: https://support.bitly.com/hc/en-us/articles/32874287800333-Why-are-there-ads-on-my-links
- **Lead the free-plan and QR pages with trust, not features.** The top two
  complaints are about the shortener hurting the link (ads, deactivation), not
  about missing analytics. Today ndle adds no interstitial and only expires
  signed-in links if the owner sets an expiry. Saying "no ads, and your links
  don't expire" out loud would be the strongest line available. It's a public
  commitment, so it's the owner's decision.
- **Raise `/use-cases/qr-codes` to the first page to build**, and pair it with
  the P1 post "QR code stopped working? Check the destination first".
- **Add a post:** "Why free QR codes stop working (and how to make one that
  doesn't)". Target queries: free qr code generator no expiration; qr code that
  never expires.
- **Product gap:** affiliates' dead links often return 200 OK with an "unavailable"
  page. ndle's checks judge by status code only, so they miss these. See
  feature-status.md.

## Sources

- Bitly pricing: https://bitly.com/pages/pricing
- Bitly troubleshooting advice: https://bitly.com/blog/troubleshoot-short-link-issues/
- Rebrandly broken links: https://support.rebrandly.com/en/articles/469614-how-do-i-monitor-and-fix-broken-branded-links-404
- LinksWatch: https://linkswatch.io/
- LinkShortener.io: https://www.linkshortener.io/
- BL.INK broken link report: https://www.bl.ink/blog/broken-qr-codes-dead-end-links
- QR Planet link check: https://qrplanet.com/help/article/broken-link-check-for-qr-codes
- Dub compare pages and tools: https://dub.co/compare/bitly, https://dub.co/sitemap.xml
- Pew, link rot: https://www.pewresearch.org/data-labs/2024/05/17/when-online-content-disappears/
- goo.gl update: https://blog.google/innovation-and-ai/technology/developers-tools/googl-link-shortening-update/
- Results that rank for "check if link is working": https://backlinkmanager.io/blog/check-if-link-is-working/
- UptimeRobot pricing: https://uptimerobot.com/pricing/

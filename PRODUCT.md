# Product

## Register

product

> Product-led, but NDLE ships two registers. The default for design work is the
> **authenticated app** (dashboard, URLs, analytics, monitoring, settings) where
> design serves the task. The **public/marketing home** (`PublicHome`,
> `GuestShortenerCard`) is a genuine **brand** surface — pulp-poster, billboard,
> vintage-signage energy — and should be worked in the brand register when
> touched. Pick per surface; the file default is `product`.

## Users

Everyone, prosumer-leaning — from someone shortening a single link to power
users running campaigns. The audience spans indie devs, marketers tracking
UTMs and traffic sources, and small teams managing shared links, collections,
and custom domains. The common thread: people who want a *real* shortener with
real-time analytics and monitoring, not a throwaway redirect. The interface
must meet a first-time visitor at the guest shortener and still reward a power
user living in the URLs table and analytics all day — without forcing either
into the other's mode.

## Product Purpose

NDLE — *"Short. Sharp. Smarter."* — is an intelligent URL shortener. It turns
a long link into a short one in seconds, then makes the link *worth keeping*:
real-time click analytics, traffic-source and UTM breakdowns, device/geo
charts, uptime monitoring and health checks, collections, custom domains, QR
codes, and an AI layer that can talk through the charts. Success looks like a
user trusting NDLE with links that matter — campaigns, launches, anything where
losing the link or the data would hurt — and coming back because the app is both
useful and a pleasure to use.

## Brand Personality

**Retro-industrial · utilitarian · with a point of view.** Monospace by default
(Geist Mono), a single confident yellow/gold accent, dashed "blueprint" borders,
and LED / billboard-flicker motion give NDLE an evidence-board, dispatch-desk,
vintage-signage character. The voice is direct and a little wry — "Short. Sharp.
Smarter." is attitude, not filler. The personality is a feature, not decoration:
it should make the tool memorable and fun to return to **without** undermining
trust in the data. Three words: **mechanical, sharp, characterful.**

Primary emotional goal: **delighted by character** — a tool with a real point of
view that people enjoy coming back to. Trust is the floor that delight is built
on; never trade legibility or reliability for a flourish.

## Anti-references

- **Generic SaaS / Bitly-clone.** No corporate blue gradients, no
  rounded-everything card soup, no "looks like every other shortener" template.
  NDLE has an identity; use it.
- **Enterprise / heavy.** No dense bureaucratic cockpit, no dashboard-as-mission-
  control overload. Density is fine; heaviness is not.
- **Over-cute / toy-like.** The personality must never tip into so much whimsy
  that the app stops feeling trustworthy with real campaigns and real money.
  Charm with restraint.
- **Templated AI default.** No cream/sand body backgrounds, no tiny tracked
  uppercase eyebrow on every section, no gradient text, no identical icon-card
  grids. If it reads as "AI generated it," it's wrong.

## Design Principles

1. **Character is the product.** NDLE's value is that it's a real tool with a
   real point of view. Carry the identity — mono, yellow, dashed lines, the LED
   flicker — deliberately into every surface. Stripping it for "clean" loses the
   thing people return for.
2. **Earned familiarity, not strangeness.** Personality lives in finish and
   detail, not in reinventing controls. Standard affordances (tables, forms,
   nav, modals-as-last-resort) done exceptionally well. The tool disappears into
   the task; the character is the seasoning, never the obstacle.
3. **Trust is the floor.** This app holds links and analytics people depend on.
   Numbers must be honest and legible, states must be truthful (loading, empty,
   error, success), and nothing decorative may compromise readability. Delight
   sits on top of reliability, never in place of it.
4. **Data that informs, not just displays.** Analytics should answer a question
   at a glance — what's working, what's broken, where the traffic came from — not
   parade hero metrics. Every chart and number earns its place by being useful.
5. **Fast, and out of the way.** Snappy, keyboard-friendly, low-friction.
   Motion conveys state in 150–250ms; no choreography users have to wait through.
   Meet the first-timer at the guest shortener and the power user in the table
   with equal ease.

## Accessibility & Inclusion

Target **WCAG 2.2 AA** across all surfaces:

- Body text ≥4.5:1 contrast; large/bold text ≥3:1. Watch the muted-gray-on-tint
  trap and the yellow accent — yellow on white fails for text, so accent is for
  fills/indicators/selection, with dark ink on top, not for body or small text.
- Full keyboard operability with visible focus states on every interactive
  element; logical tab order through the app shell and tables.
- `prefers-reduced-motion` honored for every animation (the billboard/LED
  flicker, fades, scans already have reduce paths — keep that discipline).
- Charts and color-coded data must not rely on color alone; pair with labels,
  patterns, or direct values for color-blind users.

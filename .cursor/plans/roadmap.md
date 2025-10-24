# NDLE Differentiation Roadmap

## Scope

Ship features that solve real pain points and leapfrog Bitly/Dub baselines: self-healing links, programmable routing, privacy-first analytics, and AI link intelligence. Leverage existing Convex, Tinybird, and Upstash Redis primitives.

## Phase 1 — Close Table‑Stake Gaps (2–3 weeks)

- Custom domains + DNS onboarding (CNAME + automatic verification), per-domain slug namespaces
- QR codes per link (static and branded), bulk import/export (CSV)
- Edit destination, password-protected links, time/click‑based expiry, link notes/tags
- Teams and roles (owner/admin/editor), audit log, API keys, webhooks

## Phase 2 — Unique Differentiators (3–5 weeks)

-

- Programmable Routing DSL: geo/device/time/UTM rules, A/B/n with multi‑armed bandits, retreat to best‑performer; all enforced at edge via Redis JSON
- Privacy‑first Analytics: cookieless events, IP truncation, bot filtering, Tinybird aggregation; exportable reports and scheduled digests
- AI Link Intelligence: auto summaries, topic classification, metadata enrichment, and on-page AI Q&A for each link (persisted, not mocked)

## Phase 3 — Enterprise & Ecosystem (2–3 weeks)

- SSO/SAML, org billing, usage quotas, SOC2 roadmap
- Official SDKs (JS/TS first), Zapier/HubSpot/GA4 integrations, inbound/outbound webhooks
- Link-in-bio and dynamic OG image previews for better social CTR

## Key Code Touchpoints

- Routing/Storage: `convex/redisAction.ts`, `convex/urlMainFuction.ts`, edge redirector (new), `convex/schema.ts`
- Analytics: Tinybird pipes + `convex/analyticsCache.ts`, `app/api/analytics/*`
- Health & AI: new `convex/monitoring.ts`, `convex/selfHealing.ts`, `components/link-monitoring.tsx` (replace mocks); connect `components/ai-*` to server actions
- Teams & API: new `convex/orgs.ts`, `convex/apiKeys.ts`, `app/api/webhooks/*`

## Rollout & Risk

- Start with non-breaking additions behind feature flags; add rate-limits and abuse checks up front. Ship Phase 1 weekly; Phase 2 behind allowlist until SLOs hold.

### To-dos

- [ ] Add custom domains, QR codes, editable destinations, link tags/notes
- [ ] Implement orgs, roles, audit log, API keys, webhooks
- [ ] Add geo/device/time/UTM routing and A/B/n at edge
- [ ] Implement link health checks, auto-fallbacks, and alerts
- [ ] Ship cookieless analytics with IP truncation and bot filtering
- [ ] Replace mocked AI with server actions for summaries/chat
- [ ] Add SSO/SAML, quotas, and integration connectors (Zapier/GA4)

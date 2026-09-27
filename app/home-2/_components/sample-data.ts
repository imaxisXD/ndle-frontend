import { getShortDomain } from "@/lib/config";

/* Illustrative data for the code-built product views. Plan and competitor
   facts are not here; they live with the comparison table and are carried
   over from `/`. */

export const SHORT_DOMAIN = getShortDomain();

export type Health = "healthy" | "degraded" | "down";

/** The 29 days before today, oldest first. Today's bar follows live state. */
export type SampleLink = {
  slug: string;
  destination: string;
  pastDays: Array<"ok" | "warn">;
  latencyMs: number;
  /** Seconds since the last check when the page loads. */
  checkedOffset: number;
  /** Stand-in favicon: a letter on a color, like the product's favicon chips. */
  icon: { letter: string; bg: string; fg: string };
};

function pastDays(warnAt: number[] = []): Array<"ok" | "warn"> {
  return Array.from({ length: 29 }, (_, i) => (warnAt.includes(i) ? "warn" : "ok"));
}

export const SAMPLE_LINKS: SampleLink[] = [
  {
    slug: "launch",
    icon: { letter: "A", bg: "#141210", fg: "#fafaf9" },
    destination: "acme.com/launch-week",
    pastDays: pastDays(),
    latencyMs: 142,
    checkedOffset: 8,
  },
  {
    slug: "spring-sale",
    icon: { letter: "S", bg: "#f97316", fg: "#fff7ed" },
    destination: "shop.acme.com/sale?utm_campaign=spring",
    pastDays: pastDays([12]),
    latencyMs: 188,
    checkedOffset: 23,
  },
  {
    slug: "docs",
    icon: { letter: "D", bg: "#2563eb", fg: "#eff6ff" },
    destination: "docs.acme.dev/getting-started",
    pastDays: pastDays(),
    latencyMs: 96,
    checkedOffset: 41,
  },
  {
    slug: "brand-kit",
    icon: { letter: "B", bg: "#7c3aed", fg: "#f5f3ff" },
    destination: "acme.com/press/brand-kit.zip",
    pastDays: pastDays(),
    latencyMs: 121,
    checkedOffset: 34,
  },
  {
    slug: "podcast-42",
    icon: { letter: "P", bg: "#be185d", fg: "#fdf2f8" },
    destination: "podcasts.apple.com/acme/42",
    pastDays: pastDays([6, 7]),
    latencyMs: 574,
    checkedOffset: 52,
  },
];

export type TimelineEvent = {
  time: string;
  title: string;
  meta: string;
  kind: "ok" | "warn" | "fail" | "mail" | "gap";
  /** Milliseconds to wait after the previous event before this one plays. */
  wait: number;
};

/** The hero replays one incident on the /launch link, start to finish. */
export const LAUNCH_EVENTS: TimelineEvent[] = [
  {
    time: "09:41:00",
    title: "Checked from 4 regions",
    meta: "200 OK · 142 ms",
    kind: "ok",
    wait: 0,
  },
  {
    time: "09:42:00",
    title: "One region returned 503",
    meta: "1 of 4 failing · confirming",
    kind: "warn",
    wait: 950,
  },
  {
    time: "09:42:03",
    title: "Confirmed down",
    meta: "503 Service Unavailable · 2 of 4 failing",
    kind: "fail",
    wait: 900,
  },
  {
    time: "09:42:04",
    title: "Alert emailed",
    meta: "to you@team.com",
    kind: "mail",
    wait: 800,
  },
  { time: "", title: "4 min later", meta: "", kind: "gap", wait: 700 },
  {
    time: "09:46:12",
    title: "Back online",
    meta: "200 OK · 164 ms · down 4m 12s",
    kind: "ok",
    wait: 1300,
  },
];

/** Index of the event that moves the link into each state. */
export const LAUNCH_PHASE_AT = { degraded: 1, down: 2, recovered: 5 } as const;

export function launchHealth(step: number): Health {
  if (step >= LAUNCH_PHASE_AT.recovered) return "healthy";
  if (step >= LAUNCH_PHASE_AT.down) return "down";
  if (step >= LAUNCH_PHASE_AT.degraded) return "degraded";
  return "healthy";
}

export type CampaignBar = { name: string; clicks: number; change: string; lead?: boolean };

export const CAMPAIGN_BARS: CampaignBar[] = [
  { name: "spring-sale", clicks: 4812, change: "3.4×", lead: true },
  { name: "podcast-42", clicks: 1204, change: "+8%" },
  { name: "launch", clicks: 986, change: "+2%" },
  { name: "docs", clicks: 640, change: "−4%" },
  { name: "referral", clicks: 312, change: "+1%" },
];

/* A day of latency readings for the /launch link, one per 20 minutes, with the
   incident as a gap near the end. Deterministic so server and client agree. */
export const LAUNCH_LATENCY: Array<number | null> = Array.from({ length: 72 }, (_, i) => {
  if (i === 66 || i === 67) return null;
  const wave = Math.sin(i * 0.55) * 14 + Math.sin(i * 1.7) * 7 + Math.cos(i * 0.21) * 9;
  const spike = i === 64 ? 190 : i === 65 ? 320 : 0;
  return Math.round(142 + wave + spike);
});

/* Analytics page sample data, shaped like the dashboard's own chart inputs. */
export const WEEKLY_CLICKS = [
  { day: "Mon", clicks: 412 },
  { day: "Tue", clicks: 1264 },
  { day: "Wed", clicks: 688 },
  { day: "Thu", clicks: 541 },
  { day: "Fri", clicks: 603 },
  { day: "Sat", clicks: 298 },
  { day: "Sun", clicks: 257 },
];

export const COUNTRY_CLICKS = [
  { country: "US", clicks: 1482 },
  { country: "IN", clicks: 911 },
  { country: "DE", clicks: 604 },
  { country: "GB", clicks: 522 },
  { country: "BR", clicks: 317 },
  { country: "JP", clicks: 228 },
];

export const HOURLY_CLICKS = Array.from({ length: 24 }, (_, h) => ({
  hour: String(h).padStart(2, "0"),
  clicks: Math.round(40 + 160 * Math.exp(-((h - 10) ** 2) / 18) + 110 * Math.exp(-((h - 20) ** 2) / 10)),
}));

/* Collections page sample data: real sites, so the folders show real favicons. */
export const SAMPLE_COLLECTIONS = [
  { name: "Launch week", count: 12, color: "black", urls: ["https://github.com", "https://vercel.com", "https://figma.com"] },
  { name: "Docs & tools", count: 8, color: "#ffc921", urls: ["https://notion.so", "https://linear.app", "https://slack.com"] },
  { name: "Podcast", count: 5, color: "blue", urls: ["https://youtube.com", "https://spotify.com", "https://soundcloud.com"] },
] as const;

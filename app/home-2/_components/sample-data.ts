import { getShortDomain } from "@/lib/config";

/* Illustrative data for the code-built product views. Plan and competitor
   facts are not here; they live with the comparison table and are carried
   over from `/`. */

export const SHORT_DOMAIN = getShortDomain();

/** The sample links' own site (acme.com) wears ndle's icon, not the real
    acme.com's; other sample sites keep their real favicons. */
export function sampleFavicon(destination: string) {
  return /^(https?:\/\/)?([a-z0-9-]+\.)*acme\.com(\/|$)/i.test(destination)
    ? "/favicon.ico"
    : undefined;
}

export type CampaignBar = {
  name: string;
  clicks: number;
  change: string;
  lead?: boolean;
};

export const CAMPAIGN_BARS: CampaignBar[] = [
  { name: "spring-sale", clicks: 4812, change: "3.4×", lead: true },
  { name: "podcast-42", clicks: 1204, change: "+8%" },
  { name: "launch", clicks: 986, change: "+2%" },
  { name: "docs", clicks: 640, change: "−4%" },
  { name: "referral", clicks: 312, change: "+1%" },
];

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
  clicks: Math.round(
    40 + 160 * Math.exp(-((h - 10) ** 2) / 18) + 110 * Math.exp(-((h - 20) ** 2) / 10),
  ),
}));

/* Collections page sample data. */
export const SAMPLE_COLLECTIONS = [
  {
    name: "Launch week",
    count: 12,
    color: "black",
    urls: ["https://github.com", "https://vercel.com", "https://figma.com"],
  },
  {
    name: "Docs & tools",
    count: 8,
    color: "#ffc921",
    urls: ["https://notion.so", "https://linear.app", "https://slack.com"],
  },
  {
    name: "Podcast",
    count: 5,
    color: "blue",
    urls: ["https://youtube.com", "https://spotify.com", "https://soundcloud.com"],
  },
] as const;

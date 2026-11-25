"use client";

import { Link } from "iconoir-react";
import { ExpandableBarChartCard } from "@/components/charts/expandable-bar-chart-card";

function normalizeReferrerHost(domain: string): string {
  const trimmed = domain.trim().toLowerCase();
  if (trimmed === "direct / none" || trimmed === "direct") return "direct";
  if (trimmed === "other") return "other";

  try {
    const parsed = new URL(
      /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return trimmed.split("/")[0].replace(/^www\./, "");
  }
}

function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

const EXACT_REFERRERS: Record<string, string> = {
  "t.co": "Twitter",
  "x.com": "X",
  "fb.com": "Facebook",
  "youtu.be": "YouTube",
  "t.me": "Telegram",
  "wa.me": "WhatsApp",
  direct: "Direct",
  other: "Other",
};

const DOMAIN_REFERRERS: ReadonlyArray<[string, string]> = [
  ["google.com", "Google"],
  ["twitter.com", "Twitter"],
  ["linkedin.com", "LinkedIn"],
  ["facebook.com", "Facebook"],
  ["instagram.com", "Instagram"],
  ["youtube.com", "YouTube"],
  ["reddit.com", "Reddit"],
  ["github.com", "GitHub"],
  ["tiktok.com", "TikTok"],
  ["pinterest.com", "Pinterest"],
  ["medium.com", "Medium"],
  ["discord.com", "Discord"],
  ["discord.gg", "Discord"],
  ["telegram.org", "Telegram"],
  ["whatsapp.com", "WhatsApp"],
  ["slack.com", "Slack"],
];

function getFriendlyName(domain: string): string {
  const host = normalizeReferrerHost(domain);
  if (EXACT_REFERRERS[host]) return EXACT_REFERRERS[host];
  for (const [candidate, label] of DOMAIN_REFERRERS) {
    if (matchesDomain(host, candidate)) return label;
  }
  return host;
}

export interface ReferrerData {
  domain: string;
  clicks: number;
}

export function ReferrerChart({
  data,
  isLoading,
  limit = 7,
  className,
}: {
  data?: ReferrerData[];
  isLoading?: boolean;
  limit?: number;
  className?: string;
}) {
  return (
    <ExpandableBarChartCard
      title="Traffic Sources"
      description="Where your clicks are coming from"
      dialogTitle="All Traffic Sources"
      expandLabel="View all traffic sources"
      icon={<Link className="size-5" aria-hidden="true" />}
      data={data}
      labelKey="domain"
      labelFormatter={(value) => getFriendlyName(String(value))}
      emptyTitle="No referrer data"
      emptyDescription="No traffic source data available."
      isLoading={isLoading}
      limit={limit}
      className={className}
    />
  );
}

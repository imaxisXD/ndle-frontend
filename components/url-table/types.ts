export type LinkStatus = "healthy" | "healed" | "checking";

export type DisplayUrl = {
  id: string;
  shortUrl: string;
  originalUrl: string;
  clicks: number;
  createdAt: number;
  status: LinkStatus;
  healingHistory?: Array<{
    date: string;
    action: string;
  }>;
  memory?: {
    summary: string;
    notes: string;
    savedReason: string;
  };
  analytics?: {
    dailyClicks: Array<{ day: string; clicks: number }>;
    topCountries: Array<{
      country: string;
      clicks: number;
      percentage: number;
    }>;
  };
};

export const STATUS_LABELS: Record<LinkStatus, string> = {
  healthy: "Healthy",
  healed: "Auto-healed",
  checking: "Checking",
};

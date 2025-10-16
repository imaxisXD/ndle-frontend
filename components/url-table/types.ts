export type DisplayUrl = {
  id: string;
  shortUrl: string;
  originalUrl: string;
  clicks: number;
  createdAt: number;
  status: string;
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

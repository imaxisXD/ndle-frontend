export interface UTMAnalyticsData {
  // UTM Source breakdown
  sourceData: Array<{ source: string; clicks: number }>;
  // UTM Medium breakdown
  mediumData: Array<{ medium: string; clicks: number }>;
  // UTM Campaign breakdown
  campaignData: Array<{ campaign: string; clicks: number }>;
  // UTM Term breakdown (for paid search)
  termData: Array<{ term: string; clicks: number }>;
  // UTM Content breakdown
  contentData: Array<{ content: string; clicks: number }>;
  // Source x Medium matrix
  sourceMediaMatrix: Array<{ source: string; medium: string; clicks: number }>;
  // Clicks with UTM vs without
  utmCoverage: { withUtm: number; withoutUtm: number };
  // Total clicks with UTM
  totalUtmClicks: number;
}

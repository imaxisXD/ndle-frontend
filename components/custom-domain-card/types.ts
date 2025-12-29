export type DomainStatus = "pending" | "active" | "failed";

export interface DomainData {
  _id: string;
  domain: string;
  status: DomainStatus;
  verificationTxtName?: string;
  verificationTxtValue?: string;
}

export interface DomainLimits {
  used: number;
  limit: number;
  canAddMore: boolean;
  isPro: boolean;
}

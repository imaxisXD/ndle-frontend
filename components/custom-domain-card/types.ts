export type DomainStatus =
  | "awaiting_verification"
  | "pending"
  | "active"
  | "failed";

export interface DomainData {
  _id: string;
  domain: string;
  status: DomainStatus;
  verificationTxtName?: string;
  verificationTxtValue?: string;
  // Ownership challenge, present while the domain awaits verification.
  challengeRecordName?: string;
  challengeRecordValue?: string;
}

export interface DomainLimits {
  used: number;
  limit: number;
  canAddMore: boolean;
  isPro: boolean;
}

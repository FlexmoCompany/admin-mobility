export type CampaignKind = 'CONTEST' | 'REFERRAL';

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'closed'
  | 'drawn'
  | 'archived';

export type PrizeKind = 'cash' | 'voucher' | 'physical';
export type PrizeRole = 'sponsor' | 'referred';
export type GrantStatus = 'pending' | 'delivered';

export type CriterionKey =
  | 'city'
  | 'accountActive'
  | 'minTenureDays'
  | 'minWaveRecharges'
  | 'minFuelPurchases'
  | 'minReferrals'
  | 'maxEntries';

export type CampaignCriterion = {
  key: CriterionKey;
  label: string;
  enabled: boolean;
  value?: string | number;
};

export type CampaignPrize = {
  id: string;
  kind: PrizeKind;
  role: PrizeRole;
  label: string;
  amountXof?: number;
  /** URL publique files-service / Backblaze */
  imageUrl?: string;
};

export type CampaignParticipant = {
  id: string;
  driverName: string;
  phone: string;
  enrolledAt: string;
  isWinner?: boolean;
  prizeLabel?: string;
};

export type CampaignGrant = {
  id: string;
  campaignId: string;
  campaignTitle: string;
  driverName: string;
  prizeLabel: string;
  kind: PrizeKind;
  status: GrantStatus;
  grantedAt: string;
  imageUrl?: string;
};

export type Campaign = {
  id: string;
  title: string;
  kind: CampaignKind;
  status: CampaignStatus;
  summary: string;
  rules: string;
  coverage: string;
  startsAt: string;
  endsAt: string;
  entriesCount: number;
  maxEntries?: number;
  criteria: CampaignCriterion[];
  prizes: CampaignPrize[];
  participants: CampaignParticipant[];
  winnersPublished: boolean;
  drawnAt?: string;
};

export type CampaignFormPrize = {
  label: string;
  kind: PrizeKind;
  role: PrizeRole;
  amount: string;
  imageUrl: string;
};

export type CampaignFormValues = {
  title: string;
  kind: CampaignKind;
  summary: string;
  rules: string;
  coverage: string;
  startsAt: string;
  endsAt: string;
  maxEntries: string;
  accountActive: boolean;
  minTenureDaysEnabled: boolean;
  minTenureDays: string;
  minWaveRechargesEnabled: boolean;
  minWaveRecharges: string;
  minFuelPurchasesEnabled: boolean;
  minFuelPurchases: string;
  minReferralsEnabled: boolean;
  minReferrals: string;
  /** 1 = lot unique ; N = lots multiples */
  prizes: CampaignFormPrize[];
};

import type { FuelCardAllocationRecord } from '@/features/cards-balances/types';

export type CockpitSignalTone = 'critical' | 'high' | 'medium' | 'low' | 'healthy';
export type CockpitSignalKind =
  | 'allocation'
  | 'fuel-card'
  | 'driver'
  | 'fuel-purchase'
  | 'recharge'
  | 'sync';

/**
 * Chaque champ provient d'un endpoint reel:
 * - `activeDrivers`      : `/admin/drivers/stats`
 * - `activeCards`        : `/admin/fuel-cards/stats`
 * - `balanceDiffCount`   : `/admin/fuel-cards/stats` (syncIssues)
 * - `*Allocations`       : `/admin/fuel-card-allocations/stats`
 * - `pendingPurchases`   : `/admin/fuels/statistics?status=pending`
 * - `totalLitersToday`   : `/admin/fuels/statistics` borne sur la journee
 */
export interface CockpitSummary {
  activeDrivers: number;
  activeCards: number;
  pendingAllocations: number;
  failedAllocations: number;
  queuedAllocations: number;
  balanceDiffCount: number;
  pendingPurchases: number;
  totalLitersToday: number;
}

export interface CockpitSignalRecord {
  id: string;
  kind: CockpitSignalKind;
  tone: CockpitSignalTone;
  title: string;
  subtitle: string;
  owner: string;
  amountLabel: string;
  signal: string;
  updatedAt: string;
  tags: string[];
  driverId?: string;
  partnerId?: string;
  accountId?: string;
  purchaseId?: string;
  allocationId?: string;
  navigateTo?: string;
  retryable?: boolean;
}

export interface CockpitAction {
  id: string;
  label: string;
  description: string;
  tone: CockpitSignalTone;
  count?: number;
  queryKey?: readonly unknown[];
  navigateTo?: string;
}

export interface CockpitSummaryResponse {
  success: boolean;
  data: CockpitSummary;
}

export interface CockpitSignalsResponse {
  success: boolean;
  data: {
    items: CockpitSignalRecord[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

export interface ListCockpitSignalsParams {
  page?: number;
  limit?: number;
  tone?: CockpitSignalTone | '';
  kind?: CockpitSignalKind | '';
  search?: string;
}

export type CockpitAllocationItem = Pick<
  FuelCardAllocationRecord,
  '_id' | 'status' | 'amount' | 'attempts' | 'lastError' | 'createdAt' | 'updatedAt' | 'transferId'
> & {
  accountId?: string;
  driverId?: string;
};

/** Un jour de la courbe de volume, y compris les jours sans achat. */
export interface CockpitDailyPoint {
  date: string;
  label: string;
  liters: number;
  amount: number;
  transactions: number;
}

/** Part d'une station ou d'un produit dans le volume de la periode. */
export interface CockpitBreakdownSlice {
  name: string;
  liters: number;
  amount: number;
  transactions: number;
}

export interface CockpitAllocationSlice {
  name: string;
  value: number;
  color: string;
}

export interface CockpitAnalytics {
  windowDays: number;
  startDate: string;
  endDate: string;
  series: CockpitDailyPoint[];
  stations: CockpitBreakdownSlice[];
  products: CockpitBreakdownSlice[];
  allocations: CockpitAllocationSlice[];
  totalPurchases: number;
  /** Vrai quand la periode contient plus d'achats que la page n'en ramene. */
  truncated: boolean;
}

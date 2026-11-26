/**
 * Rechargement & Allocations (finance-service,
 * `/admin/recharge-allocation/*`).
 * - Rechargement : paiement Wave du chauffeur (transaction finance) ;
 * - Allocation : crédit de la carte TotalEnergies (fuelcardallocations).
 * Lien : `allocation.transferId` = id de la recharge.
 */

export type RechargeStatus =
  | 'created'
  | 'processing'
  | 'pending'
  | 'successful'
  | 'failed'
  | 'action_required'
  | 'canceled';

export type AllocationStatus = 'queued' | 'processing' | 'success' | 'failed';

export type AllocationSource =
  | 'driver-recharge'
  | 'replay'
  | 'bonus-payout'
  | 'correction'
  | 'admin'
  | 'manual'
  | (string & {});

/**
 * - linked : la ligne liée existe ;
 * - missing : elle devrait exister mais manque (anomalie) ;
 * - not-expected : pas de ligne liée attendue (recharge non réussie, bonus…).
 */
export type LinkState = 'linked' | 'missing' | 'not-expected';

export interface DriverRef {
  id: string;
  name: string | null;
  phoneNumber: string | null;
  reference: string | null;
}

export interface AllocationSummary {
  id: string;
  status: AllocationStatus;
  amount: number;
  bonusAmount: number;
  source: AllocationSource;
  scheduledFor: string | null;
  processedAt: string | null;
  lastError: string | null;
  createdAt: string | null;
}

export interface RechargeSummary {
  id: string;
  reference: string | null;
  status: RechargeStatus;
  amount: number;
  fee: number | null;
  createdAt: string | null;
}

export interface RechargeRow extends RechargeSummary {
  waveSessionId: string | null;
  chargedAmount: number;
  updatedAt: string | null;
  env: string | null;
  failure: string | null;
  driver: DriverRef | null;
  allocation: AllocationSummary | null;
  link: LinkState;
}

export interface AllocationRow extends AllocationSummary {
  transferId: string | null;
  attempts: number;
  dispatchedAt: string | null;
  accountId: string | null;
  companyRef: string | null;
  env: string | null;
  driver: DriverRef | null;
  recharge: RechargeSummary | null;
  link: LinkState;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListResponse<T> {
  success: boolean;
  data: { items: T[]; pagination: Pagination };
}

export interface CountAmount {
  count: number;
  amount: number;
}

export interface RechargeAllocationSummary {
  recharges: Partial<Record<RechargeStatus, CountAmount>>;
  allocations: Partial<Record<AllocationStatus, CountAmount>>;
  anomalies: { rechargesWithoutAllocation: number; allocationsWithoutRecharge: number };
}

export interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  id?: string;
}

export interface ListAllocationsParams extends ListParams {
  source?: string;
}

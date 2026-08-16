export type FuelCardEnv = 'sandbox' | 'production';
export type FuelCardSyncStatus = 'success' | 'failed' | 'stale' | 'pending';
export type FuelCardAllocationStatus = 'queued' | 'processing' | 'success' | 'failed';

export interface FuelCardDriver {
  _id: string;
  firstName?: string;
  lastName?: string;
  reference?: string;
  phoneNumber?: string;
  email?: string;
  status?: string;
}

export interface FuelCardCompany {
  _id?: string;
  reference?: string;
  companyInfos?: {
    name?: string;
  };
}

export interface FuelCardLastPurchase {
  date?: string;
  amount?: number;
  station?: string;
  liters?: number;
}

export interface FuelCardRecord {
  _id: string;
  balance: number;
  partnerBalance?: number | null;
  partnerBalanceUpdatedAt?: string | null;
  partnerSyncStatus?: FuelCardSyncStatus | null;
  partnerSyncError?: string | null;
  partnerSyncSource?: string | null;
  partnerBalanceDiff?: number;
  isActive: boolean;
  env: FuelCardEnv;
  createdAt?: string;
  updatedAt?: string;
  lastPurchase?: FuelCardLastPurchase | null;
  driver?: FuelCardDriver | null;
  company?: FuelCardCompany | null;
}

export interface FuelCardStatistics {
  totalSpent: number;
  totalLiters: number;
  totalCommission: number;
  totalPurchases: number;
  currentMonthSpent: number;
  currentMonthLiters: number;
}

export interface FuelCardPurchase {
  _id: string;
  station?: string;
  product?: string;
  liters?: number;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
}

export interface FuelCardAllocationRecord {
  _id: string;
  account: string;
  driver: string;
  company: string;
  companyRef: string;
  amount: number;
  env: FuelCardEnv;
  transferId: string;
  status: FuelCardAllocationStatus;
  attempts: number;
  lastError?: string | null;
  lastAttemptAt?: string | null;
  processedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Allocation renvoyee par la liste globale `/admin/fuel-card-allocations`,
 * ou `driver` et `company` sont peuples (contrairement a la liste par compte).
 */
export interface GlobalFuelCardAllocationRecord
  extends Omit<FuelCardAllocationRecord, 'driver' | 'company'> {
  driver?: FuelCardDriver | null;
  company?: FuelCardCompany | null;
}

export interface GlobalFuelCardAllocationsResponse {
  success: boolean;
  data: {
    allocations: GlobalFuelCardAllocationRecord[];
    pagination: PaginationPayload;
  };
}

export interface FuelCardAllocationStatsResponse {
  success: boolean;
  data: {
    queued: number;
    processing: number;
    success: number;
    failed: number;
    pending: number;
    total: number;
  };
}

export interface ListGlobalAllocationsParams {
  page?: number;
  limit?: number;
  /**
   * Statut unique (`failed`) ou liste separee par des virgules (`failed,queued`).
   * Le backend traduit une liste en `$in`.
   */
  status?: '' | FuelCardAllocationStatus | (string & {});
  env?: '' | FuelCardEnv;
  companyRef?: string;
  search?: string;
  retryable?: boolean;
}

export interface PaginationPayload {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface FuelCardsListResponse {
  success: boolean;
  data: {
    fuelCards: FuelCardRecord[];
    pagination: PaginationPayload;
  };
}

export interface FuelCardsStatsResponse {
  success: boolean;
  data: {
    totalCards: number;
    activeCards: number;
    inactiveCards: number;
    totalBalance: number;
    syncIssues: number;
  };
}

export interface FuelCardDetailResponse {
  success: boolean;
  data: {
    fuelCard: FuelCardRecord;
    statistics: FuelCardStatistics;
    purchases: FuelCardPurchase[];
    pagination: PaginationPayload;
  };
}

export interface FuelCardAllocationsResponse {
  success: boolean;
  data: {
    allocations: FuelCardAllocationRecord[];
    pagination: PaginationPayload;
  };
}

export interface FuelCardMutationResponse {
  success: boolean;
  message?: string;
  data?: {
    account?: FuelCardRecord;
    allocation?: FuelCardAllocationRecord;
    addedAmount?: number;
    newBalance?: number;
    accountId?: string;
    isActive?: boolean;
    allocationId?: string;
    transferId?: string;
  };
}

export interface ListFuelCardsParams {
  page?: number;
  limit?: number;
  status?: '' | 'active' | 'inactive';
  searchTerm?: string;
  env?: '' | FuelCardEnv;
  companyRef?: string;
}

export interface FuelCardAllocationsParams {
  page?: number;
  limit?: number;
  status?: '' | FuelCardAllocationStatus;
}

export interface FuelCardDetailParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  source?: string;
}

export interface AllocateFuelCardPayload {
  amount: number;
  env?: FuelCardEnv;
}

export interface UpdateFuelCardStatusPayload {
  isActive: boolean;
}


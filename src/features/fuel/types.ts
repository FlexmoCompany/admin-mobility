export type FuelPurchaseStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type FuelPurchaseSource = 'manual' | 'import' | 'api' | 'totalenergies';

export interface FuelPurchaseDriver {
  _id?: string;
  name?: string;
  phone?: string;
  email?: string;
  reference?: string;
  company?: {
    _id?: string;
    reference?: string;
    companyInfos?: {
      name?: string;
    };
  } | null;
}

export interface FuelPurchaseRecord {
  id: string;
  reference?: string;
  transactionId?: string | null;
  externalReference?: string | null;
  externalTransactionId?: string | null;
  date?: string;
  station?: string;
  product?: string;
  volume?: number;
  liters?: number;
  unitPrice?: number;
  partnerPricePerLiter?: number;
  flexmoPricePerLiter?: number;
  totalAmount?: number;
  flexmoDiscount?: number;
  driverCashback?: number;
  status?: FuelPurchaseStatus;
  source?: FuelPurchaseSource | string;
  paymentMethod?: string | null;
  rechargedBy?: string | null;
  cardNumber?: string | null;
  driver?: FuelPurchaseDriver | null;
  fuelBonus?: Record<string, unknown> | null;
  totalEnergiesData?: Record<string, unknown> | null;
}

export interface FuelPurchasesPagination {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface FuelPurchasesResponse {
  success: boolean;
  data: FuelPurchaseRecord[];
  pagination: FuelPurchasesPagination;
}

export interface FuelPurchaseStatisticsResponse {
  success: boolean;
  data: {
    totalVolume: number;
    totalLiters: number;
    totalDiscount: number;
    totalCashback: number;
    flexmoRevenue: number;
    completedCount: number;
    pendingCount: number;
    failedCount: number;
    totalTransactions: number;
    successRate: number;
    averageTransactionValue: number;
  };
}

export interface FuelPurchaseDetailResponse {
  success: boolean;
  data: FuelPurchaseRecord;
}

export interface ListFuelPurchasesParams {
  page?: number;
  limit?: number;
  status?: FuelPurchaseStatus | '' | 'all';
  station?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  driverId?: string;
}


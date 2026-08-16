import type { FuelPurchaseStatus } from '@/features/fuel/types';

/**
 * Nature du mouvement financier porte par un achat carburant.
 * Chaque achat genere une remise partenaire et un cashback conducteur,
 * la marge nette FlexMo etant la difference entre les deux.
 */
export type FuelFinanceFlowKind = 'card-purchase' | 'discount' | 'cashback';

export type FuelFinanceFlowStatus = FuelPurchaseStatus;

export interface FuelFinanceFlowRecord {
  id: string;
  reference: string;
  kind: FuelFinanceFlowKind;
  status: FuelFinanceFlowStatus;
  amount: number;
  currency: string;
  counterparty: string;
  station?: string;
  liters?: number;
  occurredAt: string;
  driverId?: string;
  externalRef?: string;
  note?: string;
}

export interface FuelFinanceFlowsResponse {
  success: boolean;
  data: {
    items: FuelFinanceFlowRecord[];
    total: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

/**
 * Synthese derivee exclusivement de `/admin/fuels/statistics`.
 *
 * Les notions de tresorerie (solde du portefeuille TotalEnergies, recharges
 * en attente, commissions reglees) ne sont exposees par aucun service a ce
 * jour et ne figurent donc pas ici.
 */
export interface FuelFinanceOverview {
  totalAmount: number;
  volumeLiters: number;
  discountGranted: number;
  cashbackAccrued: number;
  flexmoRevenueNet: number;
  averageMarginPerLiter: number;
  totalTransactions: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
}

export interface ListFuelFinanceFlowsParams {
  page?: number;
  limit?: number;
  status?: FuelFinanceFlowStatus | '';
  kind?: FuelFinanceFlowKind | '';
  startDate?: string;
  endDate?: string;
  search?: string;
}

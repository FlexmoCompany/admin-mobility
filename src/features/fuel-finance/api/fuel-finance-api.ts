import {
  getFuelPurchaseStatistics,
  listFuelPurchases,
} from '@/features/fuel/api/fuel-api';
import type { FuelPurchaseRecord } from '@/features/fuel/types';

import type {
  FuelFinanceFlowKind,
  FuelFinanceFlowRecord,
  FuelFinanceFlowsResponse,
  FuelFinanceOverview,
  ListFuelFinanceFlowsParams,
} from '../types';

/**
 * Synthese finance carburant.
 *
 * Toutes les valeurs proviennent de `/admin/fuels/statistics`. La marge
 * moyenne au litre est le seul champ calcule, a partir de deux valeurs
 * reelles (revenu net / litres).
 */
export async function getFuelFinanceOverview(
  params: Pick<ListFuelFinanceFlowsParams, 'startDate' | 'endDate'> = {}
): Promise<FuelFinanceOverview> {
  const response = await getFuelPurchaseStatistics(params);
  const stats = response.data;

  const volumeLiters = stats?.totalLiters ?? 0;
  const flexmoRevenueNet = stats?.flexmoRevenue ?? 0;

  return {
    // `totalVolume` porte le montant total cote backend, `totalLiters` le volume.
    totalAmount: stats?.totalVolume ?? 0,
    volumeLiters,
    discountGranted: stats?.totalDiscount ?? 0,
    cashbackAccrued: stats?.totalCashback ?? 0,
    flexmoRevenueNet,
    averageMarginPerLiter: volumeLiters > 0 ? flexmoRevenueNet / volumeLiters : 0,
    totalTransactions: stats?.totalTransactions ?? 0,
    completedCount: stats?.completedCount ?? 0,
    pendingCount: stats?.pendingCount ?? 0,
    failedCount: stats?.failedCount ?? 0,
  };
}

/** Montant porte par le mouvement, selon sa nature. */
const amountForKind = (purchase: FuelPurchaseRecord, kind: FuelFinanceFlowKind) => {
  if (kind === 'discount') return purchase.flexmoDiscount ?? 0;
  if (kind === 'cashback') return purchase.driverCashback ?? 0;
  return purchase.totalAmount ?? 0;
};

const noteForKind: Record<FuelFinanceFlowKind, string> = {
  'card-purchase': 'Debit carte carburant',
  discount: 'Remise partenaire acquise par FlexMo',
  cashback: 'Cashback credite au conducteur',
};

const toFlow = (
  purchase: FuelPurchaseRecord,
  kind: FuelFinanceFlowKind
): FuelFinanceFlowRecord => ({
  id: `${purchase.id}:${kind}`,
  reference: purchase.reference || purchase.id,
  kind,
  status: purchase.status ?? 'pending',
  amount: amountForKind(purchase, kind),
  currency: 'XOF',
  counterparty: purchase.driver?.name || purchase.driver?.reference || 'Conducteur inconnu',
  station: purchase.station,
  liters: purchase.volume ?? purchase.liters,
  occurredAt: purchase.date ?? '',
  driverId: purchase.driver?._id,
  externalRef: purchase.externalReference ?? purchase.externalTransactionId ?? undefined,
  note: noteForKind[kind],
});

/**
 * Flux financiers carburant.
 *
 * Il n'existe pas de journal financier dedie cote `finance-service`: chaque
 * achat carburant est donc decompose en ses mouvements reels (debit carte,
 * remise partenaire, cashback conducteur). La pagination reste celle du
 * backend, le facteur d'expansion etant constant par achat.
 */
export async function listFuelFinanceFlows(
  params: ListFuelFinanceFlowsParams = {}
): Promise<FuelFinanceFlowsResponse> {
  const {
    page = 1,
    limit = 10,
    status = '',
    kind = '',
    startDate = '',
    endDate = '',
    search = '',
  } = params;

  const kinds: FuelFinanceFlowKind[] = kind
    ? [kind]
    : ['card-purchase', 'discount', 'cashback'];

  const response = await listFuelPurchases({
    page,
    limit,
    status,
    startDate,
    endDate,
    search,
  });

  const purchases = response.data ?? [];
  const pagination = response.pagination;

  return {
    success: true,
    data: {
      items: purchases.flatMap((purchase) =>
        kinds.map((flowKind) => toFlow(purchase, flowKind))
      ),
      total: (pagination?.total ?? 0) * kinds.length,
      page: pagination?.page ?? page,
      totalPages: pagination?.totalPages ?? 1,
      limit: pagination?.limit ?? limit,
    },
  };
}

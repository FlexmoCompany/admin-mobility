import {
  getFuelCardsStats,
  getGlobalAllocationStats,
  listGlobalAllocations,
} from '@/features/cards-balances/api/fuel-cards-api';
import type { FuelCardAllocationStatus } from '@/features/cards-balances/types';
import { getDriversStats } from '@/features/drivers/api/drivers-api';
import { getFuelPurchaseStatistics } from '@/features/fuel/api/fuel-api';

import { toAllocationSignal } from './allocation-signal';
import type {
  CockpitSignalTone,
  CockpitSignalsResponse,
  CockpitSummary,
  ListCockpitSignalsParams,
} from '../types';

/** Bornes ISO de la journee courante, pour les indicateurs "du jour". */
const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return { startDate: start.toISOString(), endDate: end.toISOString() };
};

/**
 * Le cockpit agrege quatre sources reelles: conducteurs, cartes,
 * allocations et achats carburant. Aucune valeur n'est derivee ni estimee.
 */
export async function getCockpitSummary(): Promise<CockpitSummary> {
  const { startDate, endDate } = todayRange();

  const [drivers, cards, allocations, purchasesToday, purchasesPending] =
    await Promise.all([
      getDriversStats(),
      getFuelCardsStats(),
      getGlobalAllocationStats(),
      getFuelPurchaseStatistics({ startDate, endDate }),
      getFuelPurchaseStatistics({ status: 'pending' }),
    ]);

  return {
    activeDrivers: drivers.data?.activeDrivers ?? 0,
    activeCards: cards.data?.activeCards ?? 0,
    pendingAllocations: allocations.data?.pending ?? 0,
    failedAllocations: allocations.data?.failed ?? 0,
    queuedAllocations: allocations.data?.queued ?? 0,
    // `syncIssues` compte les cartes dont le solde partenaire est en echec
    // ou perime: c'est bien l'ecart de solde suivi par le cockpit.
    balanceDiffCount: cards.data?.syncIssues ?? 0,
    pendingPurchases: purchasesPending.data?.pendingCount ?? 0,
    totalLitersToday: purchasesToday.data?.totalLiters ?? 0,
  };
}

/** Le filtre "tone" du cockpit se traduit par un statut d'allocation cote serveur. */
const statusFromTone = (tone: CockpitSignalTone | ''): '' | FuelCardAllocationStatus => {
  if (tone === 'critical') return 'failed';
  if (tone === 'high') return 'queued';
  if (tone === 'low' || tone === 'healthy') return 'success';
  return '';
};

/**
 * Les signaux du cockpit proviennent aujourd'hui des seules allocations de
 * carte carburant. Le filtre `kind` n'accepte donc que `allocation`; toute
 * autre valeur renvoie volontairement une liste vide plutot qu'un resultat
 * trompeur.
 */
export async function listCockpitSignals(
  params: ListCockpitSignalsParams = {}
): Promise<CockpitSignalsResponse> {
  const { page = 1, limit = 10, tone = '', kind = '', search = '' } = params;

  if (kind && kind !== 'allocation') {
    return {
      success: true,
      data: { items: [], total: 0, page, totalPages: 1, limit },
    };
  }

  const response = await listGlobalAllocations({
    page,
    limit,
    status: statusFromTone(tone),
    search,
  });

  const pagination = response.data?.pagination;

  return {
    success: true,
    data: {
      items: (response.data?.allocations ?? []).map(toAllocationSignal),
      total: pagination?.total ?? 0,
      page: pagination?.page ?? page,
      totalPages: pagination?.totalPages ?? 1,
      limit: pagination?.limit ?? limit,
    },
  };
}

import type { GlobalFuelCardAllocationRecord } from '@/features/cards-balances/types';

import type { CockpitSignalRecord, CockpitSignalTone } from '../types';

const toneByStatus: Record<string, CockpitSignalTone> = {
  failed: 'critical',
  queued: 'high',
  processing: 'high',
  success: 'low',
};

const titleByStatus: Record<string, string> = {
  failed: 'Allocation en echec',
  queued: 'Allocation en file',
  processing: 'Allocation en cours',
  success: 'Allocation traitee',
};

export const formatDriverName = (
  driver: GlobalFuelCardAllocationRecord['driver']
): string => {
  const name = `${driver?.firstName ?? ''} ${driver?.lastName ?? ''}`.trim();
  return name || driver?.reference || 'Conducteur inconnu';
};

export const formatPartnerName = (
  company: GlobalFuelCardAllocationRecord['company']
): string => company?.companyInfos?.name || company?.reference || '';

/**
 * Convertit une allocation en signal cockpit.
 *
 * Toutes les valeurs proviennent du document d'allocation: aucun champ
 * n'est estime ni complete par defaut.
 */
export const toAllocationSignal = (
  allocation: GlobalFuelCardAllocationRecord
): CockpitSignalRecord => {
  const status = allocation.status ?? 'queued';
  const accountId = typeof allocation.account === 'string' ? allocation.account : '';

  return {
    id: allocation._id,
    kind: 'allocation',
    tone: toneByStatus[status] ?? 'medium',
    title: titleByStatus[status] ?? 'Allocation',
    subtitle: formatDriverName(allocation.driver),
    owner: formatPartnerName(allocation.company) || 'Queue fuel.card.allocation',
    amountLabel: `${Number(allocation.amount ?? 0).toLocaleString('fr-FR')} FCFA`,
    signal:
      status === 'failed'
        ? allocation.lastError || 'Erreur non renseignee'
        : status === 'success'
          ? 'Alloue'
          : 'En attente de traitement',
    updatedAt: allocation.updatedAt ?? allocation.createdAt ?? '',
    tags: [status, 'allocation'],
    allocationId: allocation._id,
    accountId,
    driverId: allocation.driver?._id ?? '',
    navigateTo: accountId ? `/cards-balances/${accountId}` : '/cards-balances',
    retryable: status === 'failed',
  };
};

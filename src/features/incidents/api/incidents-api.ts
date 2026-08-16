import {
  getGlobalAllocationStats,
  listGlobalAllocations,
} from '@/features/cards-balances/api/fuel-cards-api';
import type { GlobalFuelCardAllocationRecord } from '@/features/cards-balances/types';
import {
  formatDriverName,
  formatPartnerName,
} from '@/features/cockpit/api/allocation-signal';

import type {
  IncidentRecord,
  IncidentSeverity,
  IncidentStatsResponse,
  IncidentStatus,
  IncidentsResponse,
  ListIncidentsParams,
} from '../types';

/**
 * Les incidents exposes par le back office correspondent aujourd'hui au seul
 * cycle de vie des allocations de carte carburant. La correspondance est
 * explicite et sans valeur inventee.
 */
const severityByStatus: Record<string, IncidentSeverity> = {
  failed: 'critical',
  queued: 'high',
  processing: 'medium',
  success: 'low',
};

const statusByAllocationStatus: Record<string, IncidentStatus> = {
  failed: 'open',
  queued: 'open',
  processing: 'investigating',
  success: 'resolved',
};

/** Statuts d'allocation couverts par un statut d'incident du filtre. */
const allocationStatusesByIncidentStatus: Record<IncidentStatus, string> = {
  open: 'failed,queued',
  investigating: 'processing',
  resolved: 'success',
  // Aucun equivalent cote allocation: le filtre ne doit rien remonter
  // plutot que de remonter des lignes sans rapport.
  mitigated: 'none',
  closed: 'none',
};

const titleByStatus: Record<string, string> = {
  failed: 'Allocation carburant en echec',
  queued: 'Allocation carburant en attente',
  processing: 'Allocation carburant en cours',
  success: 'Allocation carburant terminee',
};

const toIncident = (allocation: GlobalFuelCardAllocationRecord): IncidentRecord => {
  const status = allocation.status ?? 'queued';
  const accountId = typeof allocation.account === 'string' ? allocation.account : '';
  const driverName = formatDriverName(allocation.driver);
  const partnerName = formatPartnerName(allocation.company);

  return {
    id: allocation._id,
    reference: allocation.transferId || allocation._id,
    title: titleByStatus[status] ?? 'Allocation carburant',
    category: 'fuel-allocation',
    severity: severityByStatus[status] ?? 'medium',
    status: statusByAllocationStatus[status] ?? 'open',
    summary:
      status === 'failed'
        ? allocation.lastError || 'Echec sans message d erreur renseigne'
        : `Allocation de ${Number(allocation.amount ?? 0).toLocaleString('fr-FR')} FCFA`,
    owner: driverName,
    ownerType: 'driver',
    driverId: allocation.driver?._id ?? '',
    partnerId: allocation.company?._id ?? '',
    accountId,
    allocationId: allocation._id,
    occurredAt: allocation.createdAt ?? '',
    lastOccurrenceAt: allocation.updatedAt ?? allocation.createdAt ?? '',
    retryable: status === 'failed',
    tags: [status, 'allocation', ...(partnerName ? [partnerName] : [])],
    navigateTo: accountId ? `/cards-balances/${accountId}` : '/cards-balances',
    lastError: allocation.lastError ?? '',
    attempts: allocation.attempts ?? 0,
  };
};

export async function getIncidentStats(): Promise<IncidentStatsResponse> {
  const response = await getGlobalAllocationStats();
  const data = response.data;

  return {
    success: true,
    data: {
      open: (data?.failed ?? 0) + (data?.queued ?? 0),
      investigating: data?.processing ?? 0,
      critical: data?.failed ?? 0,
      retryable: data?.failed ?? 0,
      resolved: data?.success ?? 0,
      total: data?.total ?? 0,
    },
  };
}

export async function listIncidents(
  params: ListIncidentsParams = {}
): Promise<IncidentsResponse> {
  const { page = 1, limit = 10, status = '', category = '', search = '', retryable } = params;

  // Une seule categorie est alimentee par le backend a ce jour.
  if (category && category !== 'fuel-allocation') {
    return { success: true, data: { items: [], total: 0, page, totalPages: 1, limit } };
  }

  const allocationStatus = status ? allocationStatusesByIncidentStatus[status] : '';

  if (allocationStatus === 'none') {
    return { success: true, data: { items: [], total: 0, page, totalPages: 1, limit } };
  }

  const response = await listGlobalAllocations({
    page,
    limit,
    status: allocationStatus,
    search,
    retryable: retryable === true,
  });

  const pagination = response.data?.pagination;

  return {
    success: true,
    data: {
      items: (response.data?.allocations ?? []).map(toIncident),
      total: pagination?.total ?? 0,
      page: pagination?.page ?? page,
      totalPages: pagination?.totalPages ?? 1,
      limit: pagination?.limit ?? limit,
    },
  };
}

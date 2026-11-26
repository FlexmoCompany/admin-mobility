import { requestJson } from '@/shared/api/http';

import type {
  AllocationRow,
  ListAllocationsParams,
  ListParams,
  ListResponse,
  RechargeAllocationSummary,
  RechargeRow,
} from '../types';

const BASE = '/admin/recharge-allocation';

/** Recharges Wave des chauffeurs, chacune avec son allocation. */
export function listRecharges(params: ListParams = {}) {
  return requestJson<ListResponse<RechargeRow>>('financeService', `${BASE}/recharges`, {
    query: { ...params },
  });
}

/** Allocations TotalEnergies, chacune avec sa recharge Wave. */
export function listAllocations(params: ListAllocationsParams = {}) {
  return requestJson<ListResponse<AllocationRow>>('financeService', `${BASE}/allocations`, {
    query: { ...params },
  });
}

/** Totaux par statut et anomalies de lien (bandeau). */
export async function getRechargeAllocationSummary() {
  const res = await requestJson<{ success: boolean; data: RechargeAllocationSummary }>(
    'financeService',
    `${BASE}/summary`
  );
  return res.data;
}

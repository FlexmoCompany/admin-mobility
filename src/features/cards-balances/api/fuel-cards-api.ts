import { requestJson } from '@/shared/api/http';

import type {
  AllocateFuelCardPayload,
  FuelCardAllocationStatsResponse,
  FuelCardAllocationsParams,
  FuelCardAllocationsResponse,
  FuelCardDetailParams,
  FuelCardDetailResponse,
  FuelCardMutationResponse,
  FuelCardsListResponse,
  FuelCardsStatsResponse,
  GlobalFuelCardAllocationsResponse,
  ListFuelCardsParams,
  ListGlobalAllocationsParams,
  UpdateFuelCardStatusPayload,
} from '../types';

export function listFuelCards(params: ListFuelCardsParams = {}) {
  const {
    page = 1,
    limit = 10,
    status = '',
    searchTerm = '',
    env = '',
    companyRef = '',
  } = params;

  return requestJson<FuelCardsListResponse>('tiersService', '/admin/fuel-cards', {
    method: 'GET',
    query: {
      page,
      limit,
      status,
      searchTerm,
      env,
      companyRef,
    },
  });
}

export function getFuelCardsStats(params: Omit<ListFuelCardsParams, 'page' | 'limit'> = {}) {
  const {status = '', searchTerm = '', env = '', companyRef = ''} = params;

  return requestJson<FuelCardsStatsResponse>('tiersService', '/admin/fuel-cards/stats', {
    method: 'GET',
    query: {
      status,
      searchTerm,
      env,
      companyRef,
    },
  });
}

export function getFuelCardById(accountId: string, params: FuelCardDetailParams = {}) {
  const {page = 1, limit = 10, startDate = '', endDate = '', status = '', source = ''} = params;

  return requestJson<FuelCardDetailResponse>('tiersService', `/admin/fuel-cards/${accountId}`, {
    method: 'GET',
    query: {
      page,
      limit,
      startDate,
      endDate,
      status,
      source,
    },
  });
}

export function updateFuelCardStatus(accountId: string, payload: UpdateFuelCardStatusPayload) {
  return requestJson<FuelCardMutationResponse>(
    'tiersService',
    `/admin/fuel-cards/${accountId}/status`,
    {
      method: 'PATCH',
      body: payload,
    }
  );
}

export function allocateFuelCard(accountId: string, payload: AllocateFuelCardPayload) {
  return requestJson<FuelCardMutationResponse>(
    'tiersService',
    `/admin/fuel-cards/${accountId}/allocations`,
    {
      method: 'POST',
      body: payload,
    }
  );
}

export function listFuelCardAllocations(
  accountId: string,
  params: FuelCardAllocationsParams = {}
) {
  const {page = 1, limit = 10, status = ''} = params;

  return requestJson<FuelCardAllocationsResponse>(
    'tiersService',
    `/admin/fuel-cards/${accountId}/allocations`,
    {
      method: 'GET',
      query: {
        page,
        limit,
        status,
      },
    }
  );
}

/**
 * Liste globale des allocations, tous comptes confondus.
 * Filtrage et pagination sont assures par le backend.
 */
export function listGlobalAllocations(params: ListGlobalAllocationsParams = {}) {
  const {
    page = 1,
    limit = 10,
    status = '',
    env = '',
    companyRef = '',
    search = '',
    retryable,
  } = params;

  return requestJson<GlobalFuelCardAllocationsResponse>(
    'tiersService',
    '/admin/fuel-card-allocations',
    {
      method: 'GET',
      query: {
        page,
        limit,
        status,
        env,
        companyRef,
        search,
        retryable: retryable ? 'true' : '',
      },
    }
  );
}

export function getGlobalAllocationStats(
  params: Pick<ListGlobalAllocationsParams, 'env' | 'companyRef' | 'search'> = {}
) {
  const { env = '', companyRef = '', search = '' } = params;

  return requestJson<FuelCardAllocationStatsResponse>(
    'tiersService',
    '/admin/fuel-card-allocations/stats',
    {
      method: 'GET',
      query: { env, companyRef, search },
    }
  );
}

export function retryFuelCardAllocation(allocationId: string) {
  return requestJson<FuelCardMutationResponse>(
    'tiersService',
    `/admin/fuel-card-allocations/${allocationId}/retry`,
    {
      method: 'POST',
    }
  );
}


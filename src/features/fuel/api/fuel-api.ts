import { requestJson } from '@/shared/api/http';

import type {
  FuelPurchaseDetailResponse,
  FuelPurchasesResponse,
  FuelPurchaseStatisticsResponse,
  ListFuelPurchasesParams,
} from '../types';

export function listFuelPurchases(params: ListFuelPurchasesParams = {}) {
  const {
    page = 1,
    limit = 10,
    status = '',
    station = '',
    startDate = '',
    endDate = '',
    search = '',
    driverId = '',
  } = params;

  return requestJson<FuelPurchasesResponse>('tiersService', '/admin/fuels', {
    method: 'GET',
    query: {
      page,
      limit,
      status,
      station,
      startDate,
      endDate,
      search,
      driverId,
    },
  });
}

export function getFuelPurchaseStatistics(params: Omit<ListFuelPurchasesParams, 'page' | 'limit'> = {}) {
  const {
    status = '',
    station = '',
    startDate = '',
    endDate = '',
    search = '',
    driverId = '',
  } = params;

  return requestJson<FuelPurchaseStatisticsResponse>('tiersService', '/admin/fuels/statistics', {
    method: 'GET',
    query: {
      status,
      station,
      startDate,
      endDate,
      search,
      driverId,
    },
  });
}

export function getFuelPurchaseById(purchaseId: string) {
  return requestJson<FuelPurchaseDetailResponse>('tiersService', `/admin/fuel/${purchaseId}`);
}


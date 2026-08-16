import { requestJson } from '@/shared/api/http';

import type {
  CreateDriverPayload,
  DriverDetailedDataResponse,
  DriverDetailResponse,
  DriverMutationResponse,
  DriverStatsResponse,
  DriversListResponse,
  DriverStatus,
  FuelCardStatus,
  ListDriversParams,
  UpdateDriverPayload,
} from '../types';

export function listDrivers(params: ListDriversParams = {}) {
  const {
    page = 1,
    limit = 10,
    searchTerm = '',
    status = '',
    companyRef = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  return requestJson<DriversListResponse>('tiersService', '/admin/drivers/', {
    method: 'GET',
    query: {
      page,
      limit,
      searchTerm,
      status,
      companyRef,
      sortBy,
      sortOrder,
    },
  });
}

export function getDriversStats() {
  return requestJson<DriverStatsResponse>('tiersService', '/admin/drivers/stats');
}

export function getDriverById(driverId: string) {
  return requestJson<DriverDetailResponse>('tiersService', `/admin/driver/${driverId}`);
}

export function getDriverDetailedData(driverId: string) {
  return requestJson<DriverDetailedDataResponse>(
    'tiersService',
    `/admin/driver/${driverId}/detailed-data`
  );
}

export function createDriver(payload: CreateDriverPayload) {
  return requestJson<DriverMutationResponse>('tiersService', '/admin/driver/create', {
    method: 'POST',
    body: payload,
  });
}

export function updateDriver(driverId: string, payload: UpdateDriverPayload) {
  return requestJson<DriverMutationResponse>('tiersService', `/admin/driver/${driverId}`, {
    method: 'PUT',
    body: payload,
  });
}

export function deleteDriver(driverId: string) {
  return requestJson<DriverMutationResponse>('tiersService', `/admin/driver/${driverId}`, {
    method: 'DELETE',
  });
}

export function updateDriverStatus(driverId: string, status: DriverStatus) {
  return requestJson<DriverMutationResponse>('tiersService', `/admin/driver/${driverId}/status`, {
    method: 'PUT',
    body: {status},
  });
}

export function updateDriverFuelCard(driverId: string, fuelCardStatus: FuelCardStatus) {
  return requestJson<DriverMutationResponse>(
    'tiersService',
    `/admin/driver/${driverId}/fuel-card`,
    {
      method: 'PUT',
      body: {fuelCardStatus},
    }
  );
}

export function triggerFuelCardCreation(driverId: string) {
  return requestJson<DriverMutationResponse>(
    'tiersService',
    `/admin/driver/${driverId}/fuel-card/create`,
    {
      method: 'POST',
    }
  );
}

export function retryFuelCardCreation(driverId: string) {
  return requestJson<DriverMutationResponse>(
    'tiersService',
    `/admin/driver/${driverId}/fuel-card/retry`,
    {
      method: 'POST',
    }
  );
}

export function syncFuelCardBalance(driverId: string) {
  return requestJson<DriverMutationResponse>(
    'tiersService',
    `/admin/driver/${driverId}/fuel-card/sync`,
    {
      method: 'POST',
    }
  );
}

export function resetDriverPin(driverId: string) {
  return requestJson<DriverMutationResponse>('tiersService', `/admin/driver/${driverId}/reset-pin`, {
    method: 'POST',
  });
}

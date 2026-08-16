import { requestJson } from '@/shared/api/http';

import type {
  CompleteMaintenanceTaskPayload,
  CreateMaintenanceTaskPayload,
  CreateVehiclePayload,
  MaintenanceTaskMutationResponse,
  MaintenanceTasksResponse,
  UpdateMaintenanceTaskPayload,
  UpdateVehiclePayload,
  VehicleAssignmentResponse,
  VehicleDetailResponse,
  VehicleMutationResponse,
  VehicleStatsResponse,
  VehiclesListResponse,
  VehicleStatus,
  ListVehiclesParams,
} from '../types';

export function listVehicles(params: ListVehiclesParams = {}) {
  const {
    page = 1,
    limit = 10,
    searchTerm = '',
    status = '',
    fuelType = '',
    companyRef = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  return requestJson<VehiclesListResponse>('tiersService', '/admin/vehicles', {
    method: 'GET',
    query: {
      page,
      limit,
      searchTerm,
      status,
      fuelType,
      companyRef,
      sortBy,
      sortOrder,
    },
  });
}

export function getVehiclesStats(companyRef = '') {
  return requestJson<VehicleStatsResponse>('tiersService', '/admin/vehicles/stats', {
    method: 'GET',
    query: {
      companyRef,
    },
  });
}

export function getVehicleById(vehicleId: string) {
  return requestJson<VehicleDetailResponse>('tiersService', `/admin/vehicle/${vehicleId}`);
}

export function createVehicle(payload: CreateVehiclePayload) {
  return requestJson<VehicleMutationResponse>('tiersService', '/admin/vehicle/create', {
    method: 'POST',
    body: payload,
  });
}

export function updateVehicle(vehicleId: string, payload: UpdateVehiclePayload) {
  return requestJson<VehicleMutationResponse>('tiersService', `/admin/vehicle/${vehicleId}`, {
    method: 'PUT',
    body: payload,
  });
}

export function deleteVehicle(vehicleId: string) {
  return requestJson<VehicleMutationResponse>('tiersService', `/admin/vehicle/${vehicleId}`, {
    method: 'DELETE',
  });
}

export function updateVehicleStatus(vehicleId: string, status: VehicleStatus) {
  return requestJson<VehicleMutationResponse>('tiersService', `/admin/vehicle/${vehicleId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function assignVehicleDriver(vehicleId: string, driverId: string) {
  return requestJson<VehicleAssignmentResponse>(
    'tiersService',
    `/admin/vehicle/${vehicleId}/assign-driver`,
    {
      method: 'POST',
      body: { driverId },
    }
  );
}

export function unassignVehicleDriver(vehicleId: string) {
  return requestJson<VehicleAssignmentResponse>(
    'tiersService',
    `/admin/vehicle/${vehicleId}/unassign-driver`,
    {
      method: 'DELETE',
    }
  );
}

export function listVehicleMaintenanceTasks(vehicleId: string, page = 1, limit = 10) {
  return requestJson<MaintenanceTasksResponse>(
    'tiersService',
    `/admin/vehicle/${vehicleId}/maintenance`,
    {
      method: 'GET',
      query: { page, limit },
    }
  );
}

export function createVehicleMaintenanceTask(vehicleId: string, payload: CreateMaintenanceTaskPayload) {
  return requestJson<MaintenanceTaskMutationResponse>(
    'tiersService',
    `/admin/vehicle/${vehicleId}/maintenance`,
    {
      method: 'POST',
      body: payload,
    }
  );
}

export function updateVehicleMaintenanceTask(
  vehicleId: string,
  taskId: string,
  payload: UpdateMaintenanceTaskPayload
) {
  return requestJson<MaintenanceTaskMutationResponse>(
    'tiersService',
    `/admin/vehicle/${vehicleId}/maintenance/${taskId}`,
    {
      method: 'PUT',
      body: payload,
    }
  );
}

export function deleteVehicleMaintenanceTask(vehicleId: string, taskId: string) {
  return requestJson<MaintenanceTaskMutationResponse>(
    'tiersService',
    `/admin/vehicle/${vehicleId}/maintenance/${taskId}`,
    {
      method: 'DELETE',
    }
  );
}

export function completeVehicleMaintenanceTask(
  vehicleId: string,
  taskId: string,
  payload: CompleteMaintenanceTaskPayload
) {
  return requestJson<MaintenanceTaskMutationResponse>(
    'tiersService',
    `/admin/vehicle/${vehicleId}/maintenance/${taskId}/complete`,
    {
      method: 'POST',
      body: payload,
    }
  );
}


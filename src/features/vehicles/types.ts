export type VehicleStatus = 'available' | 'assigned' | 'maintenance' | 'out_of_service';
export type VehicleFuelType = 'gasoline' | 'diesel' | 'electric' | 'hybrid';

export interface VehicleCompany {
  _id?: string;
  reference?: string;
  companyInfos?: {
    name?: string;
  };
}

export interface VehicleAssignedDriver {
  _id?: string;
  firstName?: string;
  lastName?: string;
  reference?: string;
  phoneNumber?: string;
  email?: string;
  avatar?: string | null;
  vehicleType?: string;
}

export interface VehicleRecord {
  _id: string;
  reference?: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  status?: VehicleStatus;
  fuelType?: VehicleFuelType;
  mileage?: number;
  company?: VehicleCompany | null;
  assignedDriver?: VehicleAssignedDriver | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface VehiclesPagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface VehiclesListResponse {
  success: boolean;
  data: {
    vehicles: VehicleRecord[];
    pagination: VehiclesPagination;
  };
}

export interface VehicleStatsResponse {
  success: boolean;
  data: {
    total: number;
    available: number;
    assigned: number;
    maintenance: number;
    out_of_service: number;
    fuelTypes: Record<string, number>;
  };
}

export interface VehicleDetailResponse {
  success: boolean;
  data: {
    vehicle: VehicleRecord;
    maintenanceSummary?: {
      upcomingTasks?: number;
      overdueTasks?: number;
    };
  };
}

export interface VehicleMutationResponse {
  success: boolean;
  message?: string;
  data?: VehicleRecord;
}

export interface ListVehiclesParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: VehicleStatus | '' | 'all';
  fuelType?: VehicleFuelType | '' | 'all';
  companyRef?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'licensePlate' | 'reference';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateVehiclePayload {
  companyRef: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  fuelType: VehicleFuelType;
  mileage?: number;
  status?: VehicleStatus;
}

export interface UpdateVehiclePayload {
  companyRef?: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  fuelType?: VehicleFuelType;
  mileage?: number;
  status?: VehicleStatus;
}

export interface VehicleAssignmentResponse {
  success: boolean;
  message?: string;
  data?: VehicleRecord;
}

export type MaintenanceTaskType =
  | 'oil_change'
  | 'tire_rotation'
  | 'brake_check'
  | 'inspection'
  | 'repair'
  | 'other';

export type MaintenanceTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type MaintenanceTaskStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface MaintenanceTaskRecord {
  _id: string;
  vehicle?: string;
  type?: MaintenanceTaskType;
  description?: string;
  dueDate?: string;
  completedDate?: string | null;
  priority?: MaintenanceTaskPriority;
  estimatedCost?: number;
  actualCost?: number | null;
  status?: MaintenanceTaskStatus;
  technician?: string;
  notes?: string;
  mileageAtService?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceTasksResponse {
  success: boolean;
  data: {
    tasks: MaintenanceTaskRecord[];
    pagination: VehiclesPagination;
  };
}

export interface MaintenanceTaskMutationResponse {
  success: boolean;
  message?: string;
  data?: MaintenanceTaskRecord;
}

export interface CreateMaintenanceTaskPayload {
  type: MaintenanceTaskType;
  description: string;
  dueDate: string;
  priority?: MaintenanceTaskPriority;
  estimatedCost: number;
}

export interface UpdateMaintenanceTaskPayload {
  type?: MaintenanceTaskType;
  description?: string;
  dueDate?: string;
  priority?: MaintenanceTaskPriority;
  estimatedCost?: number;
  status?: MaintenanceTaskStatus;
  technician?: string;
  notes?: string;
}

export interface CompleteMaintenanceTaskPayload {
  actualCost?: number;
  technician?: string;
  notes?: string;
  mileage?: number;
}


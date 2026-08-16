export type DriverStatus = 'active' | 'inactive' | 'suspended';
export type FuelCardStatus = 'active' | 'inactive';
export type FuelCardCreationStatus = 'idle' | 'queued' | 'processing' | 'success' | 'failed';
export type DriverVehicleType =
  | 'two_wheels'
  | 'three_wheels'
  | 'personal'
  | 'cargo'
  | 'heavy_truck';

export interface DriverCompany {
  _id?: string;
  reference?: string;
  companyInfos?: {
    name?: string;
  };
}

export interface DriverAssignedProduct {
  _id?: string;
  name?: string;
  price?: number;
}

export interface DriverAgent {
  _id?: string;
  firstName?: string;
  lastName?: string;
  reference?: string;
  phoneNumber?: string;
  email?: string;
  status?: DriverStatus;
}

export interface DriverVehicle {
  _id?: string;
  reference?: string;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  vin?: string;
  status?: 'available' | 'assigned' | 'maintenance' | 'out_of_service';
  fuelType?: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  mileage?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverFuelPurchase {
  _id?: string;
  station?: string;
  liters?: number;
  totalAmount?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: 'cash' | 'card' | 'mobile_money' | 'account';
  source?: 'manual' | 'import' | 'api' | 'totalenergies';
  product?: string;
  cardNumber?: string;
  rechargedBy?: 'driver' | 'company';
  createdAt?: string;
  updatedAt?: string;
}

export interface DriverRecord {
  _id: string;
  firstName?: string;
  lastName?: string;
  reference?: string;
  email?: string;
  phoneNumber?: string;
  gender?: 'male' | 'female';
  avatar?: string | null;
  status?: DriverStatus;
  vehicleType?: DriverVehicleType;
  company?: DriverCompany | null;
  fuelCard?: {
    status?: FuelCardStatus;
    creationStatus?: FuelCardCreationStatus;
    attempts?: number;
    lastAttemptAt?: string;
    lastError?: string;
    cardNumber?: string;
    externalReference?: string;
  };
  fuelCardStatus?: FuelCardStatus;
  createdAt?: string;
  updatedAt?: string;
  totalConsumption?: number;
  totalLiters?: number;
  cashbackAvailable?: number;
  cashbackUsed?: number;
  assignedProducts?: DriverAssignedProduct[];
  agent?: DriverAgent | null;
  assignedVehicle?: DriverVehicle | null;
}

export interface DriversPagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface DriversListResponse {
  success: boolean;
  data: {
    drivers: DriverRecord[];
    pagination: DriversPagination;
  };
}

export interface DriverStatsResponse {
  success: boolean;
  data: {
    totalDrivers: number;
    activeDrivers: number;
    newDrivers: number;
    adoptionRate: number;
    activeFuelCards: number;
    averageCashback: number;
    growthRate: number;
  };
}

export interface DriverDetailResponse {
  success: boolean;
  data: DriverRecord;
}

export interface DriverDetailedDataResponse {
  success: boolean;
  data: {
    totalConsumption: number;
    totalLiters: number;
    cashbackAvailable: number;
    cashbackUsed: number;
    fuelCardStatus: FuelCardStatus;
    vehicles: DriverVehicle[];
    purchases: DriverFuelPurchase[];
  };
}

export interface DriverMutationResponse {
  success: boolean;
  message?: string;
  data?: DriverRecord | {pinCode?: string; emailSent?: boolean};
}

export interface ListDriversParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: DriverStatus | '';
  companyRef?: string;
  sortBy?: 'createdAt' | 'firstName' | 'lastName' | 'reference';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateDriverPayload {
  companyRef: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  password: string;
  reference?: string;
  gender?: 'male' | 'female';
  status?: DriverStatus;
  vehicleType?: DriverVehicleType;
}

export interface UpdateDriverPayload {
  companyRef?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  reference?: string;
  gender?: 'male' | 'female';
  status?: DriverStatus;
  vehicleType?: DriverVehicleType;
}

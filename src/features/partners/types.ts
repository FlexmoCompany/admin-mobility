export type PartnerStatus = 'active' | 'inactive' | 'suspended';

export interface PartnerAddress {
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
}

export interface PartnerCompanyInfos {
  name?: string;
  email?: string;
  phoneNumber?: string;
  logo?: string;
  rccm?: string;
  address?: PartnerAddress;
}

export interface PartnerCompany {
  _id: string;
  reference: string;
  status: PartnerStatus;
  isVerified: boolean;
  createdAt: string;
  description?: string;
  sandboxBalance?: number;
  productionBalance?: number;
  modules?: Array<{
    _id?: string;
    status?: 'active' | 'inactive' | 'pending';
  }>;
  companyMembers?: Array<{
    _id: string;
    active?: boolean;
  }>;
  companyInfos?: PartnerCompanyInfos;
}

export interface PartnerAdminMember {
  _id: string;
  active?: boolean;
  isVerified?: boolean;
  personalInfos?: {
    firstname?: string;
    lastname?: string;
    email?: string;
    phoneNumber?: string;
  };
  role?: {
    value?: string;
    label?: string;
  };
}

export interface PartnerEmployee {
  _id: string;
  active?: boolean;
  personalInfos?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
  phoneNumber?: string;
  createdAt?: string;
}

export interface PartnerDriver {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  reference?: string;
  status?: 'active' | 'inactive' | 'suspended';
  fuelCardStatus?: 'active' | 'inactive';
  createdAt?: string;
}

export interface PartnerVehicle {
  _id: string;
  reference?: string;
  make?: string;
  model?: string;
  licensePlate?: string;
  status?: 'available' | 'assigned' | 'maintenance' | 'out_of_service';
  fuelType?: 'gasoline' | 'diesel' | 'electric' | 'hybrid';
  mileage?: number;
  assignedDriver?: {
    firstName?: string;
    lastName?: string;
    reference?: string;
  } | null;
}

export interface PartnerAccount {
  _id: string;
  type?: string;
  env?: string;
  balance?: number;
  partnerBalance?: number | null;
  partnerSyncStatus?: 'success' | 'failed' | 'stale' | 'pending';
  isActive?: boolean;
  updatedAt?: string;
}

export interface PartnerListResponse {
  success: boolean;
  companies: PartnerCompany[];
  page: number;
  total: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

export interface PartnerStatsResponse {
  success: boolean;
  data: {
    members: {
      total: number;
      active: number;
      inactive: number;
    };
    modules: {
      total: number;
      active: number;
    };
    company: {
      _id: string;
      name: string;
      reference: string;
      status: PartnerStatus;
      isVerified: boolean;
      createdAt: string;
    };
  };
}

export interface PartnerDetailResponse {
  success: boolean;
  company: PartnerCompany;
}

export interface PartnerMutationResponse {
  success: boolean;
  message?: string;
  company?: PartnerCompany;
}

export interface PartnerAdminsResponse {
  success: boolean;
  message?: string;
  admins?: PartnerAdminMember[];
}

export interface PartnerMembersResponse {
  success: boolean;
  message?: string;
  data: {
    members: PartnerEmployee[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

export interface PartnerDriversResponse {
  success: boolean;
  data: {
    drivers: PartnerDriver[];
    pagination: {
      page: number;
      totalPages: number;
      total: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface PartnerVehiclesResponse {
  success: boolean;
  data: {
    vehicles: PartnerVehicle[];
    pagination: {
      page: number;
      totalPages: number;
      total: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface PartnerAccountsResponse {
  success: boolean;
  accounts: PartnerAccount[];
}

export interface ListPartnersParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  isVerified?: '' | 'true' | 'false';
  status?: '' | PartnerStatus;
}

export interface UpdatePartnerPayload {
  company: {
    companyInfos?: PartnerCompanyInfos;
    isVerified?: boolean;
    status?: PartnerStatus;
  };
}

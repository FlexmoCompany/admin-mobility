import { requestJson } from '@/shared/api/http';

export type AdminRole = 'superadmin' | 'admin' | 'developer';
export type AdminStatus = 'active' | 'inactive' | 'suspended';

export interface AdminRecord {
  _id: string;
  fullname: string;
  email: string;
  phoneNumber: string;
  role: AdminRole;
  status: AdminStatus;
  verified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListAdminsParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: AdminStatus | '';
  role?: AdminRole | '';
  verified?: '' | 'true' | 'false';
}

export interface ListAdminsResponse {
  success: boolean;
  admins: AdminRecord[];
  count: number;
  currentPage: number;
  totalPages: number;
  nextPage: number | null;
  prevPage: number | null;
}

export interface AdminMutationResponse {
  success: boolean;
  message?: string;
  admin?: AdminRecord;
}

export interface CreateAdminPayload {
  fullname: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: AdminRole;
}

export interface UpdateAdminPayload {
  fullname?: string;
  email?: string;
  phoneNumber?: string;
  role?: AdminRole;
  status?: AdminStatus;
  verified?: boolean;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const listAdmins = (params: ListAdminsParams) =>
  requestJson<ListAdminsResponse>('tiersService', '/admin/get-all', {
    method: 'GET',
    query: params as Record<string, string | number | boolean | null | undefined>,
  });

export const createAdmin = (payload: CreateAdminPayload) =>
  requestJson<AdminMutationResponse>('tiersService', '/admin/create', {
    method: 'POST',
    body: payload,
  });

export const updateAdmin = (adminId: string, payload: UpdateAdminPayload) =>
  requestJson<AdminMutationResponse>('tiersService', `/admin/update/${adminId}`, {
    method: 'PUT',
    body: payload,
  });

export const toggleAdminStatus = (adminId: string, status: AdminStatus) =>
  requestJson<AdminMutationResponse>(
    'tiersService',
    `/admin/toggle-status/${adminId}`,
    {
      method: 'PUT',
      body: { status },
    }
  );

export const updateAdminPassword = (
  adminId: string,
  payload: UpdatePasswordPayload
) =>
  requestJson<AdminMutationResponse>(
    'tiersService',
    `/admin/update-password/${adminId}`,
    {
      method: 'PUT',
      body: payload,
    }
  );

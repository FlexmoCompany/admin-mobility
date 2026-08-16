import { runtimeConfig } from '@/shared/api/config';
import { requestJson } from '@/shared/api/http';

export interface AuthAdmin {
  _id: string;
  fullname?: string;
  email?: string;
  phoneNumber?: string;
  role?: 'superadmin' | 'admin' | 'developer' | string;
  status?: 'active' | 'inactive' | 'suspended' | string;
  verified?: boolean;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  admin?: AuthAdmin | null;
  token?: string;
}

export interface CredentialsPayload {
  email: string;
  password: string;
}

export const authenticateAdmin = ({ email, password }: CredentialsPayload) =>
  requestJson<AuthResponse>('tiersService', '/admin/auth', {
    method: 'POST',
    body: {
      email: email.trim(),
      password,
    },
    headers: {
      product: runtimeConfig.product,
    },
  });

export const checkAdminSession = (token: string) =>
  requestJson<AuthResponse>('tiersService', '/admin/check-token', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      product: runtimeConfig.product,
    },
  });

export const logoutAdmin = (token: string) =>
  requestJson<{ success: boolean; message?: string }>(
    'tiersService',
    '/admin/logout',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        product: runtimeConfig.product,
      },
    }
  );

export const requestPasswordReset = (email: string) =>
  requestJson<{ success: boolean; message?: string }>(
    'tiersService',
    '/admin/forget-password',
    {
      method: 'POST',
      body: { email: email.trim() },
      headers: {
        product: runtimeConfig.product,
      },
    }
  );

export const validateResetOtp = (token: string, otp: string) =>
  requestJson<{ success: boolean; message?: string }>(
    'tiersService',
    `/admin/validate-otp/${token}`,
    {
      method: 'POST',
      body: { otp },
      headers: {
        product: runtimeConfig.product,
      },
    }
  );

export const resetAdminPassword = (adminId: string, newPassword: string) =>
  requestJson<{ success: boolean; message?: string }>(
    'tiersService',
    `/admin/create-new-password/${adminId}`,
    {
      method: 'PUT',
      body: { newPassword },
      headers: {
        product: runtimeConfig.product,
      },
    }
  );

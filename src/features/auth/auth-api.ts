import { runtimeConfig } from '@/shared/api/config';
import { requestJson } from '@/shared/api/http';

export interface DevicePayload {
  deviceId: string;
  deviceName: string;
  platform: string;
  ip?: string;
}

export interface AuthMember {
  _id: string;
  phoneNumber?: string;
  personalInfos?: {
    firstname?: string;
    lastname?: string;
    email?: string;
  };
  role?: {
    value?: string;
    label?: string;
  } | null;
  company?: {
    _id?: string;
    name?: string;
    reference?: string;
  } | null;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  member?: AuthMember | null;
  company?: AuthMember['company'];
  token?: string;
  permissions?: unknown[];
  isFirstLogin?: boolean;
  isMFAEnabled?: boolean;
  requiresOTP?: boolean;
  memberId?: string;
  pinId?: string;
  email?: string;
}

export interface CredentialsPayload {
  identifier: string;
  password: string;
  device: DevicePayload;
}

export const authenticateMember = ({ identifier, password, device }: CredentialsPayload) => {
  const normalizedIdentifier = identifier.trim();
  const isEmail = normalizedIdentifier.includes('@');

  return requestJson<AuthResponse>('tiersService', '/company-member/auth', {
    method: 'POST',
    body: {
      ...(isEmail ? { email: normalizedIdentifier } : { phoneNumber: normalizedIdentifier.replace(/\s/g, '') }),
      password,
      device,
    },
    headers: {
      product: runtimeConfig.product,
    },
  });
};

export const verifyMfaOnline = (code: string, token: string) =>
  requestJson<AuthResponse>('tiersService', '/company-member/mfa/verify/online', {
    method: 'POST',
    body: { code },
    headers: {
      Authorization: `Bearer ${token}`,
      product: runtimeConfig.product,
    },
  });

export const verifyDeviceOtp = ({
  pin,
  pinId,
  memberId,
  device,
}: {
  pin: string;
  pinId: string;
  memberId: string;
  device: DevicePayload;
}) =>
  requestJson<AuthResponse>('tiersService', '/company-member/verify-device-otp', {
    method: 'POST',
    body: { pin, pinId, memberId, device },
    headers: {
      product: runtimeConfig.product,
    },
  });

export const checkMemberSession = (token: string, deviceId: string) =>
  requestJson<AuthResponse>('tiersService', '/company-member/check-auth/by-token', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      deviceId,
      product: runtimeConfig.product,
    },
  });

export const logoutMember = (memberId: string, deviceId: string, token: string) =>
  requestJson<{ success: boolean; message?: string }>('tiersService', `/company-member/logout/${memberId}`, {
    method: 'POST',
    body: { deviceId },
    headers: {
      Authorization: `Bearer ${token}`,
      deviceId,
      product: runtimeConfig.product,
    },
  });

import { create } from 'zustand';

import {
  type AuthMember,
  type AuthResponse,
  type DevicePayload,
  authenticateMember,
  checkMemberSession,
  logoutMember,
  verifyDeviceOtp,
  verifyMfaOnline,
} from './auth-api';

interface Operator {
  id: string;
  name: string;
  phone: string;
  role: string;
  email?: string;
  companyName?: string;
}

interface AuthSession {
  token: string;
  member: AuthMember;
  operator: Operator;
  permissions: unknown[];
  isFirstLogin: boolean;
}

interface PendingChallenge {
  type: 'mfa' | 'device-otp';
  token?: string;
  member?: AuthMember | null;
  permissions?: unknown[];
  isFirstLogin?: boolean;
  memberId?: string;
  pinId?: string;
  email?: string;
}

interface LoginPayload {
  identifier: string;
  password: string;
  remember: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  operator: Operator | null;
  token: string;
  permissions: unknown[];
  pendingChallenge: PendingChallenge | null;
  login: (payload: LoginPayload) => Promise<'authenticated' | 'mfa' | 'device-otp'>;
  verifyMfa: (code: string) => Promise<void>;
  verifyDeviceOtp: (pin: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
}

const SESSION_KEY = 'fuel_ops_session';
const DEVICE_KEY = 'fuel_ops_device_id';

const getDeviceId = () => {
  if (typeof window === 'undefined') return 'server';

  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;

  const generated =
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `fuel-ops-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(DEVICE_KEY, generated);
  return generated;
};

const getDevicePayload = (): DevicePayload => ({
  deviceId: getDeviceId(),
  deviceName: typeof navigator === 'undefined' ? 'Fuel Ops console' : navigator.userAgent,
  platform: 'web',
});

const readStoredSession = (): AuthSession | null => {
  if (typeof window === 'undefined') return null;

  const raw = window.localStorage.getItem(SESSION_KEY) || window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

const persistSession = (session: AuthSession, remember = true) => {
  const storage = remember ? window.localStorage : window.sessionStorage;
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  storage.setItem(SESSION_KEY, JSON.stringify(session));
  storage.setItem('auth_token', session.token);
};

const clearSession = () => {
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem('auth_token');
  window.sessionStorage.removeItem('auth_token');
};

const getDisplayName = (member: AuthMember) => {
  const first = member.personalInfos?.firstname ?? '';
  const last = member.personalInfos?.lastname ?? '';
  return `${first} ${last}`.trim() || member.personalInfos?.email || member.phoneNumber || 'Ops';
};

const buildSession = (response: AuthResponse): AuthSession => {
  if (!response.token || !response.member) {
    throw new Error(response.message || 'Authentification incomplete.');
  }

  return {
    token: response.token,
    member: response.member,
    permissions: response.permissions ?? [],
    isFirstLogin: Boolean(response.isFirstLogin),
    operator: {
      id: response.member._id,
      name: getDisplayName(response.member),
      phone: response.member.phoneNumber ?? '',
      email: response.member.personalInfos?.email,
      role: response.member.role?.label || response.member.role?.value || 'Admin',
      companyName: response.company?.name || response.member.company?.name,
    },
  };
};

export const useAuthStore = create<AuthState>((set, get) => {
  const storedSession = readStoredSession();

  return {
    isAuthenticated: Boolean(storedSession),
    isLoading: false,
    error: '',
    operator: storedSession?.operator ?? null,
    token: storedSession?.token ?? '',
    permissions: storedSession?.permissions ?? [],
    pendingChallenge: null,

    login: async ({ identifier, password, remember }) => {
      set({ isLoading: true, error: '', pendingChallenge: null });
      try {
        const response = await authenticateMember({
          identifier,
          password,
          device: getDevicePayload(),
        });

        if (!response.success) {
          throw new Error(response.message || 'Connexion refusee.');
        }

        if (response.requiresOTP) {
          set({
            isLoading: false,
            pendingChallenge: {
              type: 'device-otp',
              memberId: response.memberId,
              pinId: response.pinId,
              email: response.email,
            },
          });
          return 'device-otp';
        }

        if (response.isMFAEnabled) {
          set({
            isLoading: false,
            pendingChallenge: {
              type: 'mfa',
              token: response.token,
              member: response.member,
              permissions: response.permissions ?? [],
              isFirstLogin: response.isFirstLogin,
            },
          });
          return 'mfa';
        }

        const session = buildSession(response);
        persistSession(session, remember);
        set({
          isAuthenticated: true,
          isLoading: false,
          operator: session.operator,
          token: session.token,
          permissions: session.permissions,
        });
        return 'authenticated';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Connexion impossible.';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    verifyMfa: async (code) => {
      const challenge = get().pendingChallenge;
      if (challenge?.type !== 'mfa' || !challenge.token || !challenge.member) {
        throw new Error('Aucune verification MFA en attente.');
      }

      set({ isLoading: true, error: '' });
      try {
        const response = await verifyMfaOnline(code, challenge.token);
        if (!response.success) {
          throw new Error(response.message || 'Code MFA invalide.');
        }

        const session = buildSession({
          success: true,
          token: challenge.token,
          member: challenge.member,
          permissions: challenge.permissions,
          isFirstLogin: challenge.isFirstLogin,
        });

        persistSession(session, true);
        set({
          isAuthenticated: true,
          isLoading: false,
          operator: session.operator,
          token: session.token,
          permissions: session.permissions,
          pendingChallenge: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Verification MFA impossible.';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    verifyDeviceOtp: async (pin) => {
      const challenge = get().pendingChallenge;
      if (challenge?.type !== 'device-otp' || !challenge.pinId || !challenge.memberId) {
        throw new Error('Aucune verification appareil en attente.');
      }

      set({ isLoading: true, error: '' });
      try {
        const response = await verifyDeviceOtp({
          pin,
          pinId: challenge.pinId,
          memberId: challenge.memberId,
          device: getDevicePayload(),
        });

        if (!response.success) {
          throw new Error(response.message || 'Code OTP invalide.');
        }

        const session = buildSession(response);
        persistSession(session, true);
        set({
          isAuthenticated: true,
          isLoading: false,
          operator: session.operator,
          token: session.token,
          permissions: session.permissions,
          pendingChallenge: null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Verification OTP impossible.';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    restoreSession: async () => {
      const stored = readStoredSession();
      if (!stored?.token) return;

      try {
        const response = await checkMemberSession(stored.token, getDeviceId());
        if (!response.success) throw new Error(response.message || 'Session invalide.');

        const session = buildSession({
          ...response,
          token: stored.token,
          member: response.member ?? stored.member,
        });

        persistSession(session, true);
        set({
          isAuthenticated: true,
          operator: session.operator,
          token: session.token,
          permissions: session.permissions,
        });
      } catch {
        clearSession();
        set({ isAuthenticated: false, operator: null, token: '', permissions: [] });
      }
    },

    logout: async () => {
      const current = readStoredSession();
      clearSession();
      set({ isAuthenticated: false, operator: null, token: '', permissions: [], pendingChallenge: null });

      if (current?.member?._id && current.token) {
        try {
          await logoutMember(current.member._id, getDeviceId(), current.token);
        } catch {
          // La session locale est deja fermee; l'appel serveur est best-effort.
        }
      }
    },
  };
});

import { create } from 'zustand';

import {
  clearSession,
  isRememberedSession,
  persistSession,
  readSession,
  setUnauthorizedHandler,
} from '@/shared/api/session';

import {
  type AuthAdmin,
  type AuthResponse,
  authenticateAdmin,
  checkAdminSession,
  logoutAdmin,
} from './auth-api';

interface Operator {
  id: string;
  name: string;
  phone: string;
  role: string;
  email?: string;
}

interface AuthSession {
  token: string;
  admin: AuthAdmin;
  operator: Operator;
}

interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string;
  admin: AuthAdmin | null;
  operator: Operator | null;
  token: string;
  login: (payload: LoginPayload) => Promise<'authenticated'>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  updateSessionAdmin: (admin: AuthAdmin) => void;
}

const readStoredSession = (): AuthSession | null => {
  const stored = readSession();
  if (!stored) return null;

  const admin = stored.admin as AuthAdmin;

  return {
    token: stored.token,
    admin,
    operator: mapAdminToOperator(admin),
  };
};

const getDisplayName =(admin: AuthAdmin) =>
  admin.fullname || admin.email || admin.phoneNumber || 'Ops';

const mapAdminToOperator = (admin: AuthAdmin): Operator => ({
  id: admin._id,
  name: getDisplayName(admin),
  phone: admin.phoneNumber ?? '',
  email: admin.email,
  role: admin.role || 'admin',
});

const buildSession = (response: AuthResponse): AuthSession => {
  if (!response.token || !response.admin) {
    throw new Error(response.message || 'Authentification admin incomplete.');
  }

  return {
    token: response.token,
    admin: response.admin,
    operator: mapAdminToOperator(response.admin),
  };
};

export const useAuthStore = create<AuthState>((set) => {
  const storedSession = readStoredSession();

  return {
    isAuthenticated: Boolean(storedSession),
    isLoading: false,
    error: '',
    admin: storedSession?.admin ?? null,
    operator: storedSession?.operator ?? null,
    token: storedSession?.token ?? '',

    login: async ({ email, password, remember }) => {
      set({ isLoading: true, error: '' });

      try {
        const response = await authenticateAdmin({ email, password });

        if (!response.success) {
          throw new Error(response.message || 'Connexion admin refusee.');
        }

        const session = buildSession(response);
        persistSession({ token: session.token, admin: session.admin }, remember);
        set({
          isAuthenticated: true,
          isLoading: false,
          admin: session.admin,
          operator: session.operator,
          token: session.token,
        });
        return 'authenticated';
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Connexion admin impossible.';
        set({ isLoading: false, error: message });
        throw error;
      }
    },

    restoreSession: async () => {
      const stored = readStoredSession();
      if (!stored?.token) return;

      try {
        const response = await checkAdminSession(stored.token);
        if (!response.success) {
          throw new Error(response.message || 'Session admin invalide.');
        }

        const session = buildSession({
          ...response,
          token: stored.token,
          admin: response.admin ?? stored.admin,
        });

        // On conserve le choix initial de l'admin: une session limitee a
        // l'onglet ne doit pas devenir persistante apres un simple refresh.
        persistSession(
          { token: session.token, admin: session.admin },
          isRememberedSession()
        );
        set({
          isAuthenticated: true,
          admin: session.admin,
          operator: session.operator,
          token: session.token,
        });
      } catch {
        clearSession();
        set({ isAuthenticated: false, admin: null, operator: null, token: '' });
      }
    },

    logout: async () => {
      const current = readStoredSession();
      clearSession();
      set({ isAuthenticated: false, admin: null, operator: null, token: '' });

      if (current?.token) {
        try {
          await logoutAdmin(current.token);
        } catch {
          // La session locale est deja fermee; l'appel serveur reste best-effort.
        }
      }
    },

    updateSessionAdmin: (admin) => {
      const current = readStoredSession();
      if (!current) return;

      const nextSession: AuthSession = {
        ...current,
        admin,
        operator: mapAdminToOperator(admin),
      };

      persistSession(
        { token: nextSession.token, admin: nextSession.admin },
        isRememberedSession()
      );
      set({
        admin: nextSession.admin,
        operator: nextSession.operator,
      });
    },
  };
});

// Un 401 renvoye par n'importe quel appel API ferme la session localement,
// ce qui redirige vers /auth/login via RequireAuth.
setUnauthorizedHandler(() => {
  if (!useAuthStore.getState().isAuthenticated) return;

  clearSession();
  useAuthStore.setState({
    isAuthenticated: false,
    admin: null,
    operator: null,
    token: '',
    error: 'Votre session a expire. Veuillez vous reconnecter.',
  });
});

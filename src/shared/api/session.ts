/**
 * Source unique de verite pour la session admin persistee.
 *
 * `http.ts` et `auth-store.ts` passent tous les deux par ce module afin
 * d'eviter la double ecriture du token (`auth_token` + `fuel_ops_session`)
 * qui pouvait se desynchroniser selon le choix "se souvenir de moi".
 */

const SESSION_KEY = 'fuel_ops_session';

export interface StoredAdmin {
  _id: string;
  fullname?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  status?: string;
  verified?: boolean;
}

export interface StoredSession {
  token: string;
  admin: StoredAdmin;
}

const hasWindow = () => typeof window !== 'undefined';

/** Valide la forme minimale attendue: un JSON.parse reussi ne suffit pas. */
const isStoredSession = (value: unknown): value is StoredSession => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Partial<StoredSession>;

  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    typeof candidate.admin === 'object' &&
    candidate.admin !== null &&
    typeof (candidate.admin as StoredAdmin)._id === 'string'
  );
};

export const readSession = (): StoredSession | null => {
  if (!hasWindow()) return null;

  const raw =
    window.localStorage.getItem(SESSION_KEY) ||
    window.sessionStorage.getItem(SESSION_KEY);

  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return isStoredSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const readToken = (): string => readSession()?.token ?? '';

/**
 * Indique si la session courante a ete persistee durablement
 * ("se souvenir de moi") ou seulement pour l'onglet en cours.
 */
export const isRememberedSession = (): boolean =>
  hasWindow() && window.localStorage.getItem(SESSION_KEY) !== null;

export const persistSession = (session: StoredSession, remember = true) => {
  if (!hasWindow()) return;

  // On purge les deux storages avant d'ecrire pour ne jamais laisser
  // une session fantome dans celui qui n'est pas retenu.
  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);

  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = () => {
  if (!hasWindow()) return;

  window.localStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(SESSION_KEY);
};

/**
 * Notification de session expiree.
 *
 * `http.ts` ne peut pas importer le store zustand sans creer un cycle
 * (`auth-store` -> `auth-api` -> `http`), on passe donc par un handler
 * enregistre au demarrage de l'application.
 */
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  unauthorizedHandler = handler;
};

export const notifyUnauthorized = () => {
  unauthorizedHandler?.();
};

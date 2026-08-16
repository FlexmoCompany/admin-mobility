import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { ApiError, requestJson } from '@/shared/api/http';
import {
  clearSession,
  isRememberedSession,
  persistSession,
  readSession,
  readToken,
  setUnauthorizedHandler,
} from '@/shared/api/session';

import { stubFetch } from './helpers/fetch-mock';

/** Storage minimal en memoire, l'environnement de test est en mode node. */
class MemoryStorage {
  private store = new Map<string, string>();

  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  get size() {
    return this.store.size;
  }
}

let localStorage: MemoryStorage;
let sessionStorage: MemoryStorage;

const admin = { _id: 'adm-1', fullname: 'Ops Admin', role: 'superadmin' };

beforeEach(() => {
  localStorage = new MemoryStorage();
  sessionStorage = new MemoryStorage();
  vi.stubGlobal('window', { localStorage, sessionStorage });
});

afterEach(() => {
  setUnauthorizedHandler(null);
  vi.unstubAllGlobals();
});

describe('session', () => {
  test('la session est ecrite dans un seul storage a la fois', () => {
    persistSession({ token: 'tok-1', admin }, true);
    expect(localStorage.size).toBe(1);
    expect(sessionStorage.size).toBe(0);

    persistSession({ token: 'tok-2', admin }, false);
    expect(localStorage.size).toBe(0);
    expect(sessionStorage.size).toBe(1);
    expect(readToken()).toBe('tok-2');
  });

  test('une session persistee est distinguee d une session d onglet', () => {
    persistSession({ token: 'tok', admin }, true);
    expect(isRememberedSession()).toBe(true);

    persistSession({ token: 'tok', admin }, false);
    expect(isRememberedSession()).toBe(false);
  });

  test('un JSON valide mais de forme inattendue est rejete', () => {
    localStorage.setItem('fuel_ops_session', JSON.stringify({ token: 'tok' }));
    expect(readSession()).toBeNull();

    localStorage.setItem('fuel_ops_session', JSON.stringify({ admin }));
    expect(readSession()).toBeNull();

    localStorage.setItem('fuel_ops_session', 'pas du json');
    expect(readSession()).toBeNull();
  });

  test('clearSession purge les deux storages', () => {
    persistSession({ token: 'tok', admin }, true);
    sessionStorage.setItem('fuel_ops_session', JSON.stringify({ token: 'x', admin }));

    clearSession();

    expect(readToken()).toBe('');
    expect(localStorage.size).toBe(0);
    expect(sessionStorage.size).toBe(0);
  });
});

describe('requestJson', () => {
  test('joint le token de session courant en Authorization', async () => {
    persistSession({ token: 'tok-abc', admin }, true);
    const stub = stubFetch({ '/admin/get-all': { json: { success: true } } });

    await requestJson('tiersService', '/admin/get-all');

    expect(stub.calls[0].headers.Authorization).toBe('Bearer tok-abc');
  });

  test('n envoie pas d en-tete Authorization sans session', async () => {
    const stub = stubFetch({ '/admin/get-all': { json: { success: true } } });

    await requestJson('tiersService', '/admin/get-all');

    expect(stub.calls[0].headers.Authorization).toBeUndefined();
  });

  test('omet les parametres de requete vides', async () => {
    const stub = stubFetch({ '/admin/drivers': { json: { success: true } } });

    await requestJson('tiersService', '/admin/drivers/', {
      query: { page: 1, status: '', companyRef: undefined, searchTerm: 'awa' },
    });

    const params = stub.queryFor('/admin/drivers');
    expect(params.get('page')).toBe('1');
    expect(params.get('searchTerm')).toBe('awa');
    expect(params.has('status')).toBe(false);
    expect(params.has('companyRef')).toBe(false);
  });

  test('un 401 declenche le handler de session expiree', async () => {
    persistSession({ token: 'tok', admin }, true);
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    stubFetch({ '/admin/get-all': { status: 401, json: { message: 'Token expire' } } });

    await expect(requestJson('tiersService', '/admin/get-all')).rejects.toThrow('Token expire');
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  test('une reponse non JSON produit une ApiError lisible', async () => {
    stubFetch({ '/admin/get-all': { status: 502, text: '<html>Bad Gateway</html>' } });

    await expect(requestJson('tiersService', '/admin/get-all')).rejects.toThrow(
      /Reponse non JSON du serveur \(502\)/
    );
  });

  test('l ApiError porte le statut et la charge utile du serveur', async () => {
    stubFetch({
      '/admin/get-all': { status: 422, json: { success: false, message: 'Champ manquant' } },
    });

    const error = await requestJson('tiersService', '/admin/get-all').catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(422);
    expect(error.message).toBe('Champ manquant');
  });
});

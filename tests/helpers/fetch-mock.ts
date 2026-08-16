import { vi } from 'vitest';

export interface StubbedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface StubResponse {
  status?: number;
  json?: unknown;
  text?: string;
}

/**
 * Remplace `fetch` par une table de correspondance chemin -> reponse.
 *
 * La cle est testee par inclusion sur l'URL complete, ce qui permet
 * d'ecrire `'/admin/fuel-card-allocations/stats'` sans repeter l'hote.
 * Les appels effectues sont enregistres afin de verifier les query params.
 */
export function stubFetch(routes: Record<string, StubResponse>) {
  const calls: StubbedCall[] = [];

  const impl = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);

    calls.push({
      url,
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });

    // La cle la plus specifique gagne, sinon `/admin/fuel-cards` capterait
    // aussi `/admin/fuel-cards/stats`.
    const key = Object.keys(routes)
      .filter((candidate) => url.includes(candidate))
      .sort((a, b) => b.length - a.length)[0];

    if (!key) {
      throw new Error(`Aucune route stubbee pour ${url}`);
    }

    const route = routes[key];
    const body = route.text ?? JSON.stringify(route.json ?? {});

    return {
      ok: (route.status ?? 200) < 400,
      status: route.status ?? 200,
      text: async () => body,
    } as Response;
  });

  vi.stubGlobal('fetch', impl);

  return {
    calls,
    /** Query params du premier appel dont l'URL contient `fragment`. */
    queryFor(fragment: string) {
      const call = calls.find((entry) => entry.url.includes(fragment));
      if (!call) throw new Error(`Aucun appel vers ${fragment}`);
      return new URL(call.url).searchParams;
    },
  };
}

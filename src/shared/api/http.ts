import { runtimeConfig, serviceConfig } from './config';
import { notifyUnauthorized, readToken } from './session';

type ServiceName = 'tiersService' | 'financeService';

type Primitive = string | number | boolean;

type QueryValue = Primitive | null | undefined;

export type QueryParams = Record<string, QueryValue>;

interface JsonRequestOptions extends Omit<RequestInit, 'body'> {
  query?: QueryParams;
  body?: unknown;
}

class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const buildUrl =(service: ServiceName, path: string, query?: QueryParams) => {
  const trimmedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(
    `${serviceConfig[service]}${trimmedPath}`,
    serviceConfig.apiGateway
  );

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

export async function requestJson<T>(
  service: ServiceName,
  path: string,
  options: JsonRequestOptions = {}
): Promise<T> {
  const { query, body, headers, ...init } = options;
  const token = readToken();

  const response = await fetch(buildUrl(service, path, query), {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Env: runtimeConfig.env,
      product: runtimeConfig.product,
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 304) {
    throw new ApiError('Reponse en cache (304). Veuillez reessayer.', 304, null);
  }

  const textPayload = await response.text();
  let payload: unknown = null;

  if (textPayload) {
    try {
      payload = JSON.parse(textPayload);
    } catch {
      // Une passerelle en erreur peut renvoyer du HTML: on ne masque pas
      // l'echec derriere un SyntaxError peu lisible.
      throw new ApiError(
        `Reponse non JSON du serveur (${response.status}).`,
        response.status,
        textPayload
      );
    }
  }

  // Session expiree ou revoquee: on purge et on renvoie l'admin vers l'ecran
  // de connexion plutot que de laisser chaque page echouer isolement.
  if (response.status === 401) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    const message =
      typeof payload === 'object' &&
      payload !== null &&
      'message' in payload &&
      typeof payload.message === 'string'
        ? payload.message
        : 'La requete API a echoue.';

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

export { ApiError };

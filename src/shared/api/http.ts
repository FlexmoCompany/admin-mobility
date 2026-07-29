import { runtimeConfig, serviceConfig } from './config';

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

const getAccessToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }

  return (
    window.localStorage.getItem('auth_token') ||
    window.sessionStorage.getItem('auth_token') ||
    ''
  );
};

const buildUrl = (service: ServiceName, path: string, query?: QueryParams) => {
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

  const response = await fetch(buildUrl(service, path, query), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Env: runtimeConfig.env,
      product: runtimeConfig.product,
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const textPayload = await response.text();
  const payload = textPayload ? JSON.parse(textPayload) : null;

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

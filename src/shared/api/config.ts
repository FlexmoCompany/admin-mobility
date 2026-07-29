const DEFAULT_API_GATEWAY_URL = 'http://localhost:4000';
const DEFAULT_BACKOFFICE_ENV = 'sandbox';
const DEFAULT_AUTH_PRODUCT = 'Flexmo-Fuel-Ops';

export const serviceConfig = {
  apiGateway:
    import.meta.env.VITE_API_GATEWAY_URL?.trim() || DEFAULT_API_GATEWAY_URL,
  tiersService: '/v1/tiers-service',
  financeService: '/v1/finance-service',
} as const;

export const runtimeConfig = {
  env: import.meta.env.VITE_BACKOFFICE_ENV?.trim() || DEFAULT_BACKOFFICE_ENV,
  product: import.meta.env.VITE_AUTH_PRODUCT?.trim() || DEFAULT_AUTH_PRODUCT,
} as const;

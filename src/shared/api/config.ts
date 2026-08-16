const DEV_API_GATEWAY_URL = 'http://localhost:4000';
const DEFAULT_BACKOFFICE_ENV = 'sandbox';
const DEFAULT_AUTH_PRODUCT = 'Flexmo-Fuel-Ops';

/**
 * `VITE_API_GATEWAY_URL` est resolue au build, jamais au runtime.
 *
 * En developpement, on retombe sur la passerelle locale. En production, une
 * variable absente est une erreur de configuration du build: mieux vaut echouer
 * immediatement que laisser l'application appeler `localhost` chez l'admin.
 */
const resolveApiGateway = () => {
  const configured = import.meta.env.VITE_API_GATEWAY_URL?.trim();
  if (configured) return configured;

  if (import.meta.env.DEV) return DEV_API_GATEWAY_URL;

  throw new Error(
    'VITE_API_GATEWAY_URL est absente du build de production. ' +
      "Renseignez-la comme variable de build (et non d'execution)."
  );
};

export const serviceConfig = {
  apiGateway: resolveApiGateway(),
  tiersService: '/v1/tiers-service',
  financeService: '/v1/finance-service',
} as const;

export const runtimeConfig = {
  env: import.meta.env.VITE_BACKOFFICE_ENV?.trim() || DEFAULT_BACKOFFICE_ENV,
  product: import.meta.env.VITE_AUTH_PRODUCT?.trim() || DEFAULT_AUTH_PRODUCT,
} as const;

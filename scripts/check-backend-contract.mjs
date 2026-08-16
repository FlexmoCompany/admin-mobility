#!/usr/bin/env node
/**
 * Verifie que la passerelle deployee expose bien les endpoints dont
 * `admin-mobility` a besoin, module par module.
 *
 *   node scripts/check-backend-contract.mjs <URL_GATEWAY> <TOKEN_ADMIN>
 *
 * Exemple:
 *   node scripts/check-backend-contract.mjs https://api-pp.flexmo.app eyJhbGciOi...
 *
 * Le token s'obtient en se connectant au back office puis en lisant
 * `fuel_ops_session` dans le localStorage du navigateur.
 *
 * Seules des requetes GET sont effectuees: le script ne modifie aucune donnee.
 * Un 401/403 signifie "route presente mais token invalide ou insuffisant",
 * un 404 signifie "route absente du backend deploye".
 */

const [, , rawBaseUrl, token] = process.argv;

if (!rawBaseUrl || !token) {
  console.error('Usage: node scripts/check-backend-contract.mjs <URL_GATEWAY> <TOKEN_ADMIN>');
  process.exit(2);
}

const baseUrl = rawBaseUrl.replace(/\/+$/, '');
const TIERS = '/v1/tiers-service';

/** Une entree par module du back office, avec une route GET representative. */
const CHECKS = [
  { module: 'auth', path: '/admin/check-token' },
  { module: 'admins', path: '/admin/get-all?page=1&limit=1' },
  { module: 'partners', path: '/company/get-all/by-filters?page=1&limit=1' },
  { module: 'drivers', path: '/admin/drivers/?page=1&limit=1' },
  { module: 'drivers', path: '/admin/drivers/stats' },
  { module: 'vehicles', path: '/admin/vehicles?page=1&limit=1' },
  { module: 'vehicles', path: '/admin/vehicles/stats' },
  { module: 'fuel', path: '/admin/fuels?page=1&limit=1' },
  { module: 'fuel', path: '/admin/fuels/statistics' },
  { module: 'cards-balances', path: '/admin/fuel-cards?page=1&limit=1' },
  { module: 'cards-balances', path: '/admin/fuel-cards/stats' },
  { module: 'cockpit / incidents', path: '/admin/fuel-card-allocations?page=1&limit=1' },
  { module: 'cockpit / incidents', path: '/admin/fuel-card-allocations/stats' },
];

const probe = async ({ module, path: routePath }) => {
  const url = `${baseUrl}${TIERS}${routePath}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        product: 'Flexmo-Fuel-Ops',
        Env: process.env.BACKOFFICE_ENV || 'production',
      },
    });

    return { module, routePath, status: response.status };
  } catch (error) {
    return { module, routePath, status: 0, error: error.message };
  }
};

const verdict = ({ status, error }) => {
  if (status === 0) return `INJOIGNABLE (${error})`;
  if (status === 404) return 'ABSENTE (404)';
  if (status === 401 || status === 403) return `presente, auth refusee (${status})`;
  if (status >= 500) return `presente, erreur serveur (${status})`;
  if (status < 400) return `OK (${status})`;
  return `presente (${status})`;
};

const results = [];
for (const check of CHECKS) {
  results.push(await probe(check));
}

const width = Math.max(...results.map((r) => r.routePath.length));

let lastModule = '';
for (const result of results) {
  if (result.module !== lastModule) {
    console.log(`\n${result.module}`);
    lastModule = result.module;
  }
  const mark = result.status === 404 || result.status === 0 ? '✗' : '✓';
  console.log(`  ${mark} ${result.routePath.padEnd(width)}  ${verdict(result)}`);
}

const unreachable = results.filter((r) => r.status === 0);
const missing = results.filter((r) => r.status === 404);

if (unreachable.length === results.length) {
  console.log(`\nPasserelle injoignable sur ${baseUrl} — verifiez l'URL et le reseau.`);
  process.exit(1);
}

const reachable = results.length - unreachable.length;
console.log(`\n${reachable - missing.length}/${reachable} routes presentes sur ${baseUrl}`);

if (missing.length > 0) {
  console.log(
    `\n${missing.length} route(s) absente(s): les modules concernes afficheront ` +
      `une erreur de chargement dans le back office.`
  );
}

if (missing.length > 0 || unreachable.length > 0) {
  process.exit(1);
}

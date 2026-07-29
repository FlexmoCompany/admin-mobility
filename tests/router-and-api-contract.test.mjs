import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const projectRoot = '/Users/code/Desktop/Projects/FlexMo/flexmo-fuel-ops';
const packageJsonPath = `${projectRoot}/package.json`;
const routesPath = `${projectRoot}/src/app/router/routes.tsx`;
const appPath = `${projectRoot}/src/App.tsx`;
const apiConfigPath = `${projectRoot}/src/shared/api/config.ts`;
const partnersApiPath = `${projectRoot}/src/features/partners/api/list-partners.ts`;
const authApiPath = `${projectRoot}/src/features/auth/auth-api.ts`;

test('le package inclut un vrai routeur SPA', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.ok(
    packageJson.dependencies['react-router-dom'],
    'react-router-dom doit etre installe'
  );
});

test('l application est branchee sur une definition de routes centralisee', () => {
  assert.ok(fs.existsSync(routesPath), 'routes.tsx doit exister');

  const appSource = fs.readFileSync(appPath, 'utf8');
  const routesSource = fs.readFileSync(routesPath, 'utf8');

  assert.match(appSource, /RouterProvider/);
  assert.match(routesSource, /createBrowserRouter/);
  assert.match(routesSource, /path:\s*'\/partners'/);
  assert.match(routesSource, /path:\s*'\/cockpit'/);
});

test('le client API centralise les services backend cibles', () => {
  assert.ok(fs.existsSync(apiConfigPath), 'config.ts API doit exister');

  const apiConfigSource = fs.readFileSync(apiConfigPath, 'utf8');

  assert.match(apiConfigSource, /apiGateway/);
  assert.match(apiConfigSource, /tiersService/);
  assert.match(apiConfigSource, /financeService/);
  assert.match(apiConfigSource, /VITE_AUTH_PRODUCT/);
  assert.match(apiConfigSource, /Flexmo-Fuel-Ops/);
});

test('la fonctionnalite partenaires cible les endpoints admin existants', () => {
  assert.ok(fs.existsSync(partnersApiPath), 'list-partners.ts doit exister');

  const partnersApiSource = fs.readFileSync(partnersApiPath, 'utf8');

  assert.match(partnersApiSource, /\/company\/get-all\/by-filters/);
  assert.match(partnersApiSource, /\/companies\/\$\{companyId\}\/stats/);
});

test('l authentification frontend suit le contrat membre du tiers-service', () => {
  assert.ok(fs.existsSync(authApiPath), 'auth-api.ts doit exister');

  const authApiSource = fs.readFileSync(authApiPath, 'utf8');

  assert.match(authApiSource, /\/company-member\/auth/);
  assert.match(authApiSource, /\/company-member\/check-auth\/by-token/);
  assert.match(authApiSource, /\/company-member\/mfa\/verify\/online/);
  assert.match(authApiSource, /\/company-member\/verify-device-otp/);
  assert.match(authApiSource, /product:\s*runtimeConfig\.product/);
});

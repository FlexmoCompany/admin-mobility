import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = path.resolve(projectRoot, '..');

/**
 * Le back office et les microservices vivent dans des depots distincts.
 * Quand `tiers-service` n'est pas present a cote, la verification de contrat
 * est ignoree plutot que de faire echouer une CI qui ne cible que ce depot.
 */
const serviceRoots: Record<string, string> = {
  tiersService: path.join(workspaceRoot, 'tiers-service', 'routes'),
  financeService: path.join(workspaceRoot, 'finance-service', 'routes'),
};

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && full.endsWith('.js') ? [full] : [];
  });

/** `/admin/driver/${id}/status` -> `/admin/driver/:/status` */
const normalize = (route: string) =>
  route
    .replace(/\$\{[^}]*\}/g, ':')
    .replace(/:[A-Za-z0-9_]+/g, ':')
    .replace(/\/+$/, '');

const collectFrontendCalls = () => {
  const featuresDir = path.join(projectRoot, 'src', 'features');
  const calls: Array<{ service: string; route: string; file: string }> = [];

  for (const file of walk(featuresDir.replace(/\.js$/, '')).concat([])) void file;

  const tsFiles = (function collect(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return collect(full);
      return entry.isFile() && full.endsWith('.ts') ? [full] : [];
    });
  })(featuresDir);

  const pattern =
    /requestJson<[^>]*>\(\s*['"](tiersService|financeService)['"]\s*,\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/gs;

  for (const file of tsFiles) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(pattern)) {
      calls.push({
        service: match[1],
        route: match[3],
        file: path.relative(projectRoot, file),
      });
    }
  }

  return calls;
};

const collectBackendRoutes = (service: string) => {
  const root = serviceRoots[service];
  if (!existsSync(root)) return null;

  const routes = new Set<string>();

  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(
      /(?:app|router)\.(?:get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g
    )) {
      routes.add(normalize(match[1]));
    }
  }

  return routes;
};

describe('contrat API entre le back office et les microservices', () => {
  const calls = collectFrontendCalls();

  test('des appels API sont bien detectes dans les modules', () => {
    expect(calls.length).toBeGreaterThan(20);
  });

  for (const service of Object.keys(serviceRoots)) {
    const serviceCalls = calls.filter((call) => call.service === service);
    if (serviceCalls.length === 0) continue;

    test(`chaque route ${service} appelee existe cote backend`, (context) => {
      const backendRoutes = collectBackendRoutes(service);

      if (!backendRoutes) {
        context.skip(`${service} absent du poste de travail`);
        return;
      }

      const missing = serviceCalls
        .filter((call) => !backendRoutes.has(normalize(call.route)))
        .map((call) => `${call.route}  (${call.file})`);

      expect(missing, `Routes ${service} introuvables cote backend`).toEqual([]);
    });
  }
});

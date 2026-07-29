import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJsonPath =
  '/Users/code/Desktop/Projects/FlexMo/flexmo-fuel-ops/package.json';

test('le package du back office utilise le stack frontend moderne demande', () => {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  assert.equal(packageJson.scripts.dev, 'vite');
  assert.equal(packageJson.scripts.build, 'tsc -b && vite build');

  assert.equal(packageJson.dependencies.react, '19.1.0');
  assert.equal(packageJson.dependencies['react-dom'], '19.1.0');
  assert.ok(packageJson.dependencies['@mantine/core']);
  assert.ok(packageJson.dependencies['@mantine/notifications']);
  assert.ok(packageJson.dependencies['@mantine/charts']);
  assert.ok(packageJson.dependencies['@tanstack/react-query']);
  assert.ok(packageJson.dependencies['@tanstack/react-table']);
  assert.ok(packageJson.dependencies['lucide-react']);
  assert.ok(packageJson.dependencies.zustand);

  assert.ok(packageJson.devDependencies.vite);
  assert.ok(packageJson.devDependencies.typescript);
  assert.ok(packageJson.devDependencies['@vitejs/plugin-react']);
});

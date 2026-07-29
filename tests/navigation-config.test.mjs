import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const navigationFilePath =
  '/Users/code/Desktop/Projects/FlexMo/flexmo-fuel-ops/src/config/navigation.ts'

test('la navigation interne expose les modules MVP du back office fuel ops', () => {
  const source = fs.readFileSync(navigationFilePath, 'utf8');
  const keys = Array.from(source.matchAll(/key:\s*'([^']+)'/g), (match) => match[1]);

  assert.deepEqual(
    keys,
    [
      'cockpit',
      'partners',
      'drivers',
      'vehicles',
      'fuel',
      'cards-balances',
      'fuel-finance',
      'incidents',
    ]
  );
});

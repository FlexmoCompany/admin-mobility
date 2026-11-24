import { afterEach, describe, expect, test, vi } from 'vitest';

import { getWelcomeExperiment, updateWelcomeExperiment, type VariantStats } from '@/features/experiments/api';
import { conversionPValue, conversionVerdict } from '@/features/experiments/stats';

import { stubFetch } from './helpers/fetch-mock';

afterEach(() => {
  vi.unstubAllGlobals();
});

const stats = (drivers: number, converted: number): VariantStats => ({
  drivers,
  converted,
  conversionRate: drivers ? converted / drivers : 0,
  firstRechargeAvg: null,
  firstRechargeAtLeastMin: 0,
  medianHoursToFirstRecharge: null,
  rechargeCount: 0,
  rechargesPerConverted: 0,
  totalRecharged: 0,
  bonusGranted: 0,
  bonusForfeited: 0,
  bonusCost: 0,
  costPerConverted: null,
});

describe('client A/B bonus de bienvenue (tiers-service)', () => {
  test('lit et règle via /v1/tiers-service/admin/experiments/welcome-bonus', async () => {
    const stub = stubFetch({
      '/admin/experiments/welcome-bonus': { json: { success: true, experiment: {}, stats: {} } },
    });
    await getWelcomeExperiment();
    await updateWelcomeExperiment({ status: 'stopped', splitA: 40 });
    expect(stub.calls[0].url).toContain('/v1/tiers-service/admin/experiments/welcome-bonus');
    expect(stub.calls[0].method).toBe('GET');
    expect(stub.calls[1].method).toBe('PUT');
    expect(stub.calls[1].body).toEqual({ status: 'stopped', splitA: 40 });
  });
});

describe('lecture statistique de la conversion', () => {
  test('p-value proche des tables : 60/100 contre 45/100 ≈ 0,034', () => {
    expect(conversionPValue(stats(100, 60), stats(100, 45))).toBeCloseTo(0.034, 2);
  });

  test('aucune variance ou groupe vide : pas de p-value', () => {
    expect(conversionPValue(stats(0, 0), stats(10, 2))).toBeNull();
    expect(conversionPValue(stats(10, 0), stats(10, 0))).toBeNull();
  });

  test('trop peu de chauffeurs : verdict « données insuffisantes »', () => {
    expect(conversionVerdict(stats(1, 0), stats(29, 5))).toEqual({
      kind: 'insufficient',
      missingA: 29,
      missingB: 1,
    });
  });

  test('écart significatif : gagnant désigné, sinon pas de différence', () => {
    const win = conversionVerdict(stats(100, 45), stats(100, 60));
    expect(win.kind).toBe('winner');
    expect(win.kind === 'winner' && win.winner).toBe('B');
    expect(conversionVerdict(stats(100, 50), stats(100, 52)).kind).toBe('no-difference');
  });
});

import { afterEach, describe, expect, test, vi } from 'vitest';

import { getCockpitSummary, listCockpitSignals } from '@/features/cockpit/api/cockpit-api';

import { stubFetch } from './helpers/fetch-mock';

const DRIVER_STATS = '/admin/drivers/stats';
const CARD_STATS = '/admin/fuel-cards/stats';
const ALLOCATION_STATS = '/admin/fuel-card-allocations/stats';
const ALLOCATIONS = '/admin/fuel-card-allocations';
const FUEL_STATS = '/admin/fuels/statistics';

const summaryRoutes = () => ({
  [DRIVER_STATS]: {
    json: { success: true, data: { totalDrivers: 140, activeDrivers: 118 } },
  },
  [CARD_STATS]: {
    json: {
      success: true,
      data: { totalCards: 130, activeCards: 121, inactiveCards: 9, totalBalance: 0, syncIssues: 5 },
    },
  },
  [ALLOCATION_STATS]: {
    json: {
      success: true,
      data: { queued: 3, processing: 1, success: 80, failed: 6, pending: 4, total: 90 },
    },
  },
  [FUEL_STATS]: {
    json: {
      success: true,
      data: { totalLiters: 812, totalVolume: 640000, pendingCount: 9, failedCount: 2 },
    },
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCockpitSummary', () => {
  test('chaque indicateur provient de son endpoint reel', async () => {
    stubFetch(summaryRoutes());

    const summary = await getCockpitSummary();

    expect(summary.activeDrivers).toBe(118);
    expect(summary.activeCards).toBe(121);
    expect(summary.pendingAllocations).toBe(4);
    expect(summary.failedAllocations).toBe(6);
    expect(summary.queuedAllocations).toBe(3);
    expect(summary.balanceDiffCount).toBe(5);
    expect(summary.pendingPurchases).toBe(9);
    expect(summary.totalLitersToday).toBe(812);
  });

  test('le volume du jour est borne sur la journee courante', async () => {
    const stub = stubFetch(summaryRoutes());

    await getCockpitSummary();

    const params = stub.queryFor(FUEL_STATS);
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');

    expect(startDate).toBeTruthy();
    expect(endDate).toBeTruthy();

    const today = new Date().toISOString().slice(0, 10);
    expect(startDate?.slice(0, 10)).toBe(today);
    expect(new Date(startDate!).getHours()).toBe(0);
    expect(new Date(endDate!).getHours()).toBe(23);
  });

  test('aucun indicateur n est fige a zero quand une source echoue', async () => {
    stubFetch({ ...summaryRoutes(), [DRIVER_STATS]: { status: 500, json: { message: 'KO' } } });

    await expect(getCockpitSummary()).rejects.toThrow('KO');
  });
});

describe('listCockpitSignals', () => {
  const allocations = (items: unknown[], total = items.length) => ({
    [ALLOCATIONS]: {
      json: {
        success: true,
        data: {
          allocations: items,
          pagination: { page: 1, limit: 10, total, totalPages: 1 },
        },
      },
    },
  });

  test('convertit une allocation en echec en signal critique', async () => {
    stubFetch(
      allocations([
        {
          _id: 'alloc-9',
          account: 'acc-9',
          amount: 15000,
          status: 'failed',
          lastError: 'Timeout partenaire',
          driver: { _id: 'drv-9', firstName: 'Koffi', lastName: 'Yao' },
          company: { reference: 'COM_9', companyInfos: { name: 'Flotte Abidjan' } },
          createdAt: '2026-08-10T08:00:00.000Z',
          updatedAt: '2026-08-10T08:30:00.000Z',
        },
      ])
    );

    const signal = (await listCockpitSignals()).data.items[0];

    expect(signal.tone).toBe('critical');
    expect(signal.title).toBe('Allocation en echec');
    expect(signal.subtitle).toBe('Koffi Yao');
    expect(signal.owner).toBe('Flotte Abidjan');
    expect(signal.signal).toBe('Timeout partenaire');
    expect(signal.retryable).toBe(true);
    expect(signal.amountLabel).toContain('15');
  });

  test('le filtre de criticite est traduit en statut cote serveur', async () => {
    const stub = stubFetch(allocations([]));

    await listCockpitSignals({ tone: 'critical' });

    expect(stub.queryFor(ALLOCATIONS).get('status')).toBe('failed');
  });

  test('un type de signal non couvert ne declenche aucun appel', async () => {
    const stub = stubFetch(allocations([]));

    const result = await listCockpitSignals({ kind: 'fuel-purchase' });

    expect(result.data.items).toEqual([]);
    expect(stub.calls).toHaveLength(0);
  });

  test('une erreur backend remonte au lieu de renvoyer zero signal', async () => {
    stubFetch({ [ALLOCATIONS]: { status: 502, json: { message: 'Passerelle indisponible' } } });

    await expect(listCockpitSignals()).rejects.toThrow('Passerelle indisponible');
  });
});

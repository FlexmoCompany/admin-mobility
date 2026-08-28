import { afterEach, describe, expect, test, vi } from 'vitest';

import { getCockpitAnalytics } from '@/features/cockpit/api/cockpit-analytics';

import { stubFetch } from './helpers/fetch-mock';

const PURCHASES = '/admin/fuels';
const ALLOCATION_STATS = '/admin/fuel-card-allocations/stats';

const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
};

const routes = (data: unknown[], total = data.length) => ({
  [PURCHASES]: { json: { success: true, data, pagination: { total, page: 1, totalPages: 1, limit: 500 } } },
  [ALLOCATION_STATS]: {
    json: {
      success: true,
      data: { queued: 3, processing: 1, success: 12, failed: 4, pending: 4, total: 20 },
    },
  },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCockpitAnalytics', () => {
  test('la serie couvre toute la fenetre, jours sans achat compris', async () => {
    stubFetch(routes([{ id: '1', date: isoDaysAgo(0), liters: 30, totalAmount: 25000, station: 'A', product: 'SUPER SP' }]));

    const analytics = await getCockpitAnalytics(14);

    expect(analytics.series).toHaveLength(14);
    expect(analytics.series.at(-1)?.liters).toBe(30);
    // Un jour sans achat vaut zero, il n'est pas omis : sinon la courbe
    // relierait deux dates non contigues.
    expect(analytics.series.at(0)?.liters).toBe(0);
  });

  test('les achats hors fenetre ne sont pas comptes dans la serie', async () => {
    stubFetch(routes([{ id: '1', date: isoDaysAgo(40), liters: 50, totalAmount: 40000, station: 'A' }]));

    const analytics = await getCockpitAnalytics(14);

    expect(analytics.series.every((point) => point.liters === 0)).toBe(true);
    // Le total par station reste alimente : il porte sur la reponse, pas sur
    // la fenetre du graphe.
    expect(analytics.stations[0]?.liters).toBe(50);
  });

  test('stations et produits sont classes par volume decroissant', async () => {
    stubFetch(
      routes([
        { id: '1', date: isoDaysAgo(1), liters: 10, totalAmount: 8000, station: 'Petite', product: 'GASOIL' },
        { id: '2', date: isoDaysAgo(2), liters: 40, totalAmount: 33000, station: 'Grande', product: 'SUPER SP' },
        { id: '3', date: isoDaysAgo(3), liters: 25, totalAmount: 20000, station: 'Grande', product: 'SUPER SP' },
      ])
    );

    const analytics = await getCockpitAnalytics(14);

    expect(analytics.stations.map((s) => s.name)).toEqual(['Grande', 'Petite']);
    expect(analytics.stations[0]?.transactions).toBe(2);
    expect(analytics.products[0]?.name).toBe('SUPER SP');
  });

  test('une page incomplete est signalee plutot que presentee comme complete', async () => {
    stubFetch(routes([{ id: '1', date: isoDaysAgo(1), liters: 10, totalAmount: 8000, station: 'A' }], 900));

    const analytics = await getCockpitAnalytics(14);

    expect(analytics.truncated).toBe(true);
    expect(analytics.totalPurchases).toBe(900);
  });

  test('seuls les statuts d allocation non nuls deviennent des parts', async () => {
    stubFetch(routes([]));

    const analytics = await getCockpitAnalytics(14);

    expect(analytics.allocations.map((slice) => slice.name)).toEqual([
      'Abouties',
      'En file',
      'En cours',
      'En echec',
    ]);
    expect(analytics.allocations.find((slice) => slice.name === 'En echec')?.value).toBe(4);
  });
});

import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  getFuelFinanceOverview,
  listFuelFinanceFlows,
} from '@/features/fuel-finance/api/fuel-finance-api';

import { stubFetch } from './helpers/fetch-mock';

const FUEL_STATS = '/admin/fuels/statistics';
const FUELS = '/admin/fuels';

const purchase = (overrides: Record<string, unknown> = {}) => ({
  id: 'pur-1',
  reference: 'TXN_1',
  station: 'TE Marcory',
  volume: 40,
  unitPrice: 800,
  totalAmount: 32000,
  flexmoDiscount: 2400,
  driverCashback: 640,
  status: 'completed',
  date: '2026-08-12T10:00:00.000Z',
  driver: { _id: 'drv-1', name: 'Awa Kone', reference: 'DRV_1' },
  ...overrides,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getFuelFinanceOverview', () => {
  test('reprend les agregats du backend sans en inventer', async () => {
    stubFetch({
      [FUEL_STATS]: {
        json: {
          success: true,
          data: {
            totalVolume: 1280000,
            totalLiters: 1600,
            totalDiscount: 96000,
            totalCashback: 25600,
            flexmoRevenue: 70400,
            completedCount: 38,
            pendingCount: 3,
            failedCount: 1,
            totalTransactions: 42,
          },
        },
      },
    });

    const overview = await getFuelFinanceOverview();

    expect(overview.totalAmount).toBe(1280000);
    expect(overview.volumeLiters).toBe(1600);
    expect(overview.discountGranted).toBe(96000);
    expect(overview.cashbackAccrued).toBe(25600);
    expect(overview.flexmoRevenueNet).toBe(70400);
    expect(overview.totalTransactions).toBe(42);
    expect(overview.pendingCount).toBe(3);
    expect(overview.failedCount).toBe(1);
    // Seule valeur calculee: revenu net / litres.
    expect(overview.averageMarginPerLiter).toBe(44);
  });

  test('la marge au litre vaut zero sans volume, sans division par zero', async () => {
    stubFetch({
      [FUEL_STATS]: {
        json: { success: true, data: { totalLiters: 0, flexmoRevenue: 5000 } },
      },
    });

    const overview = await getFuelFinanceOverview();

    expect(overview.averageMarginPerLiter).toBe(0);
    expect(Number.isFinite(overview.averageMarginPerLiter)).toBe(true);
  });

  test('propage l erreur au lieu de retourner une tresorerie a zero', async () => {
    stubFetch({ [FUEL_STATS]: { status: 500, json: { message: 'Agregation impossible' } } });

    await expect(getFuelFinanceOverview()).rejects.toThrow('Agregation impossible');
  });
});

describe('listFuelFinanceFlows', () => {
  const fuelsRoute = (items: unknown[], total = items.length) => ({
    [FUELS]: {
      json: {
        success: true,
        data: items,
        pagination: { total, page: 1, totalPages: Math.ceil(total / 10), limit: 10 },
      },
    },
  });

  test('decompose chaque achat en ses trois mouvements reels', async () => {
    stubFetch(fuelsRoute([purchase()]));

    const flows = (await listFuelFinanceFlows()).data.items;

    expect(flows).toHaveLength(3);
    expect(flows.map((flow) => flow.kind)).toEqual(['card-purchase', 'discount', 'cashback']);

    const byKind = Object.fromEntries(flows.map((flow) => [flow.kind, flow.amount]));
    expect(byKind['card-purchase']).toBe(32000);
    expect(byKind.discount).toBe(2400);
    expect(byKind.cashback).toBe(640);

    expect(flows[0].counterparty).toBe('Awa Kone');
    expect(flows[0].station).toBe('TE Marcory');
    expect(flows[0].liters).toBe(40);
  });

  test('le filtre par type ne remonte que le mouvement demande', async () => {
    stubFetch(fuelsRoute([purchase()]));

    const flows = (await listFuelFinanceFlows({ kind: 'cashback' })).data.items;

    expect(flows).toHaveLength(1);
    expect(flows[0].kind).toBe('cashback');
    expect(flows[0].amount).toBe(640);
  });

  test('les mouvements d un meme achat ont des identifiants distincts', async () => {
    stubFetch(fuelsRoute([purchase()]));

    const ids = (await listFuelFinanceFlows()).data.items.map((flow) => flow.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('les filtres de periode et de statut sont transmis au backend', async () => {
    const stub = stubFetch(fuelsRoute([]));

    await listFuelFinanceFlows({
      status: 'completed',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      search: 'Marcory',
    });

    const params = stub.queryFor(FUELS);
    expect(params.get('status')).toBe('completed');
    expect(params.get('startDate')).toBe('2026-08-01');
    expect(params.get('endDate')).toBe('2026-08-31');
    expect(params.get('search')).toBe('Marcory');
  });

  test('une erreur backend remonte au lieu d une table vide', async () => {
    stubFetch({ [FUELS]: { status: 503, json: { message: 'Service carburant indisponible' } } });

    await expect(listFuelFinanceFlows()).rejects.toThrow('Service carburant indisponible');
  });
});
